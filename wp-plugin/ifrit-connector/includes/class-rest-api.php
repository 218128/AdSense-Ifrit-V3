<?php
/**
 * Ifrit REST API
 * 
 * Custom REST API endpoints for Ifrit dashboard communication.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_REST_API
{

    /**
     * API namespace
     */
    const NAMESPACE = 'ifrit/v1';

    /**
     * Register REST routes
     */
    public function register_routes()
    {
        // Health check (public)
        register_rest_route(self::NAMESPACE , '/health', array(
            'methods' => 'GET',
            'callback' => array($this, 'health_check'),
            'permission_callback' => '__return_true',
        ));

        // Site info
        register_rest_route(self::NAMESPACE , '/site', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_site_info'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Analytics
        register_rest_route(self::NAMESPACE , '/analytics', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_analytics'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Content - Create post
        register_rest_route(self::NAMESPACE , '/posts', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Content - Update post
        register_rest_route(self::NAMESPACE , '/posts/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => array($this, 'update_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Media upload
        register_rest_route(self::NAMESPACE , '/media', array(
            'methods' => 'POST',
            'callback' => array($this, 'upload_media'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        // Plugins
        register_rest_route(self::NAMESPACE , '/plugins', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_plugins'),
            'permission_callback' => array($this, 'check_permission'),
        ));

        register_rest_route(self::NAMESPACE , '/plugins/install', array(
            'methods' => 'POST',
            'callback' => array($this, 'install_plugin'),
            'permission_callback' => array($this, 'check_remote_management'),
        ));

        // Sync webhook URL
        register_rest_route(self::NAMESPACE , '/webhook-url', array(
            'methods' => 'POST',
            'callback' => array($this, 'set_webhook_url'),
            'permission_callback' => array($this, 'check_permission'),
        ));
    }

    /**
     * Check API token permission
     */
    public function check_permission($request)
    {
        return Ifrit_Connector::validate_token($request);
    }

    /**
     * Check remote management permission
     */
    public function check_remote_management($request)
    {
        if (!get_option('ifrit_remote_management_enabled')) {
            return new WP_Error('forbidden', 'Remote management is disabled', array('status' => 403));
        }
        return $this->check_permission($request);
    }

    /**
     * Health check endpoint (public with CORS)
     */
    public function health_check()
    {
        $data = array(
            'status' => 'ok',
            'active' => true,  // Add active flag for Ifrit verification
            'plugin' => 'ifrit-connector',
            'version' => IFRIT_CONNECTOR_VERSION,
            'wordpress' => get_bloginfo('version'),
            'php' => PHP_VERSION,
            'timestamp' => current_time('c'),
        );

        $response = new WP_REST_Response($data, 200);

        // Add CORS headers for cross-origin requests
        $response->header('Access-Control-Allow-Origin', '*');
        $response->header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        $response->header('Access-Control-Allow-Headers', 'Content-Type, X-Ifrit-Token');

        return $response;
    }

    /**
     * Get site information
     */
    public function get_site_info()
    {
        global $wp_version;

        $theme = wp_get_theme();

        return array(
            'success' => true,
            'site' => array(
                'name' => get_bloginfo('name'),
                'description' => get_bloginfo('description'),
                'url' => home_url(),
                'admin_email' => get_bloginfo('admin_email'),
                'language' => get_bloginfo('language'),
                'timezone' => wp_timezone_string(),
            ),
            'wordpress' => array(
                'version' => $wp_version,
                'multisite' => is_multisite(),
            ),
            'theme' => array(
                'name' => $theme->get('Name'),
                'version' => $theme->get('Version'),
                'template' => $theme->get_template(),
            ),
            'stats' => array(
                'posts' => wp_count_posts()->publish,
                'pages' => wp_count_posts('page')->publish,
                'comments' => wp_count_comments()->approved,
                'users' => count_users()['total_users'],
            ),
        );
    }

    /**
     * Get analytics data (from Site Kit if available)
     */
    public function get_analytics()
    {
        if (!get_option('ifrit_analytics_sync_enabled')) {
            return new WP_Error('disabled', 'Analytics sync is disabled', array('status' => 403));
        }

        $analytics_bridge = new Ifrit_Analytics_Bridge();
        return $analytics_bridge->get_all_data();
    }

    /**
     * Create a new post
     */
    public function create_post($request)
    {
        if (!get_option('ifrit_content_receiver_enabled')) {
            return new WP_Error('disabled', 'Content receiver is disabled', array('status' => 403));
        }

        $content_receiver = new Ifrit_Content_Receiver();
        return $content_receiver->create_post($request->get_json_params());
    }

    /**
     * Update an existing post
     */
    public function update_post($request)
    {
        if (!get_option('ifrit_content_receiver_enabled')) {
            return new WP_Error('disabled', 'Content receiver is disabled', array('status' => 403));
        }

        $content_receiver = new Ifrit_Content_Receiver();
        return $content_receiver->update_post(
            $request->get_param('id'),
            $request->get_json_params()
        );
    }

    /**
     * Upload media
     */
    public function upload_media($request)
    {
        if (!get_option('ifrit_content_receiver_enabled')) {
            return new WP_Error('disabled', 'Content receiver is disabled', array('status' => 403));
        }

        $content_receiver = new Ifrit_Content_Receiver();
        return $content_receiver->upload_media($request);
    }

    /**
     * Get installed plugins
     */
    public function get_plugins()
    {
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $all_plugins = get_plugins();
        $active_plugins = get_option('active_plugins', array());

        $plugins = array();
        foreach ($all_plugins as $path => $plugin) {
            $plugins[] = array(
                'path' => $path,
                'name' => $plugin['Name'],
                'version' => $plugin['Version'],
                'active' => in_array($path, $active_plugins),
                'author' => $plugin['Author'],
            );
        }

        return array(
            'success' => true,
            'plugins' => $plugins,
        );
    }

    /**
     * Install a plugin
     */
    public function install_plugin($request)
    {
        $remote_manager = new Ifrit_Remote_Manager();
        return $remote_manager->install_plugin($request->get_json_params());
    }

    /**
     * Set webhook URL
     */
    public function set_webhook_url($request)
    {
        $params = $request->get_json_params();

        if (empty($params['webhook_url'])) {
            return new WP_Error('missing_url', 'Webhook URL is required', array('status' => 400));
        }

        update_option('ifrit_webhook_url', esc_url_raw($params['webhook_url']));

        return array(
            'success' => true,
            'message' => 'Webhook URL updated',
        );
    }
}
