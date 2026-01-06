<?php
/**
 * Ifrit Analytics Bridge
 * 
 * Bridges analytics data from Site Kit to Ifrit.
 * Falls back to WordPress stats if Site Kit not available.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_Analytics_Bridge
{

    /**
     * Check if Site Kit is active
     */
    public function is_site_kit_active()
    {
        return defined('GOOGLESITEKIT_VERSION') || is_plugin_active('google-site-kit/google-site-kit.php');
    }

    /**
     * Get all analytics data
     */
    public function get_all_data()
    {
        $data = array(
            'success' => true,
            'site_kit_active' => $this->is_site_kit_active(),
            'wordpress_stats' => $this->get_wordpress_stats(),
        );

        // Try to get Site Kit data
        if ($this->is_site_kit_active()) {
            $site_kit_data = $this->get_site_kit_data();
            if ($site_kit_data) {
                $data['search_console'] = $site_kit_data['search_console'] ?? null;
                $data['analytics'] = $site_kit_data['analytics'] ?? null;
                $data['adsense'] = $site_kit_data['adsense'] ?? null;
                $data['page_speed'] = $site_kit_data['page_speed'] ?? null;
            }
        }

        return $data;
    }

    /**
     * Get WordPress native stats
     */
    private function get_wordpress_stats()
    {
        global $wpdb;

        // Posts by status
        $post_counts = wp_count_posts();

        // Posts per month (last 6 months)
        $posts_by_month = $wpdb->get_results("
            SELECT 
                DATE_FORMAT(post_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM {$wpdb->posts}
            WHERE post_status = 'publish'
            AND post_type = 'post'
            AND post_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(post_date, '%Y-%m')
            ORDER BY month DESC
        ");

        // Comments per month
        $comments_by_month = $wpdb->get_results("
            SELECT 
                DATE_FORMAT(comment_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM {$wpdb->comments}
            WHERE comment_approved = '1'
            AND comment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(comment_date, '%Y-%m')
            ORDER BY month DESC
        ");

        // Top posts (by comment count)
        $top_posts = $wpdb->get_results("
            SELECT 
                p.ID,
                p.post_title,
                p.comment_count,
                p.post_date
            FROM {$wpdb->posts} p
            WHERE p.post_status = 'publish'
            AND p.post_type = 'post'
            ORDER BY p.comment_count DESC
            LIMIT 10
        ");

        return array(
            'posts' => array(
                'published' => $post_counts->publish,
                'draft' => $post_counts->draft,
                'pending' => $post_counts->pending,
                'total' => array_sum((array) $post_counts),
            ),
            'pages' => wp_count_posts('page')->publish,
            'comments' => array(
                'approved' => wp_count_comments()->approved,
                'pending' => wp_count_comments()->moderated,
                'spam' => wp_count_comments()->spam,
            ),
            'users' => count_users()['total_users'],
            'posts_by_month' => $posts_by_month,
            'comments_by_month' => $comments_by_month,
            'top_posts' => array_map(function ($post) {
                return array(
                    'id' => $post->ID,
                    'title' => $post->post_title,
                    'comments' => $post->comment_count,
                    'url' => get_permalink($post->ID),
                );
            }, $top_posts),
        );
    }

    /**
     * Get Site Kit data
     * 
     * Note: This attempts to read Site Kit's stored data.
     * Full integration requires Site Kit's API which may change.
     */
    private function get_site_kit_data()
    {
        // Site Kit stores data in options and transients
        // This is a simplified approach - full integration would use Site Kit's API

        $data = array();

        // Try to get Search Console data from Site Kit options
        $sc_data = get_option('googlesitekit_search_console_data');
        if ($sc_data) {
            $data['search_console'] = $sc_data;
        }

        // Try to get Analytics data
        $analytics_data = get_option('googlesitekit_analytics_data');
        if ($analytics_data) {
            $data['analytics'] = $analytics_data;
        }

        // Try to get AdSense data
        $adsense_data = get_option('googlesitekit_adsense_data');
        if ($adsense_data) {
            $data['adsense'] = $adsense_data;
        }

        // PageSpeed - we can call the API directly for this
        $page_speed = $this->get_page_speed_data();
        if ($page_speed) {
            $data['page_speed'] = $page_speed;
        }

        return $data ?: null;
    }

    /**
     * Get PageSpeed Insights data
     * Uses Google's public API (no auth required)
     */
    private function get_page_speed_data()
    {
        $transient_key = 'ifrit_pagespeed_' . md5(home_url());
        $cached = get_transient($transient_key);

        if ($cached !== false) {
            return $cached;
        }

        // PageSpeed Insights API (public, rate limited)
        $url = add_query_arg(array(
            'url' => urlencode(home_url()),
            'strategy' => 'mobile',
            'category' => 'performance',
        ), 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed');

        $response = wp_remote_get($url, array('timeout' => 30));

        if (is_wp_error($response)) {
            return null;
        }

        $body = json_decode(wp_remote_retrieve_body($response), true);

        if (empty($body['lighthouseResult'])) {
            return null;
        }

        $lighthouse = $body['lighthouseResult'];
        $categories = $lighthouse['categories'] ?? array();
        $audits = $lighthouse['audits'] ?? array();

        $data = array(
            'performance' => ($categories['performance']['score'] ?? 0) * 100,
            'accessibility' => ($categories['accessibility']['score'] ?? 0) * 100,
            'best_practices' => ($categories['best-practices']['score'] ?? 0) * 100,
            'seo' => ($categories['seo']['score'] ?? 0) * 100,
            'lcp' => $audits['largest-contentful-paint']['numericValue'] ?? null,
            'fid' => $audits['max-potential-fid']['numericValue'] ?? null,
            'cls' => $audits['cumulative-layout-shift']['numericValue'] ?? null,
            'fetched_at' => current_time('c'),
        );

        // Cache for 1 hour
        set_transient($transient_key, $data, HOUR_IN_SECONDS);

        return $data;
    }
}
