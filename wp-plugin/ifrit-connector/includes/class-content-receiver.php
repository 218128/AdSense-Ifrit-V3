<?php
/**
 * Ifrit Content Receiver
 * 
 * Receives and publishes content from Ifrit dashboard.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_Content_Receiver
{

    /**
     * Create a new post from Ifrit
     * 
     * @param array $data Post data
     * @return array|WP_Error Response
     */
    public function create_post($data)
    {
        // Validate required fields
        if (empty($data['title'])) {
            return new WP_Error('missing_title', 'Post title is required', array('status' => 400));
        }

        if (empty($data['content'])) {
            return new WP_Error('missing_content', 'Post content is required', array('status' => 400));
        }

        // Prepare post data
        $post_data = array(
            'post_title' => sanitize_text_field($data['title']),
            'post_content' => wp_kses_post($data['content']),
            'post_status' => sanitize_text_field($data['status'] ?? 'draft'),
            'post_type' => sanitize_text_field($data['type'] ?? 'post'),
            'post_excerpt' => sanitize_textarea_field($data['excerpt'] ?? ''),
            'post_name' => sanitize_title($data['slug'] ?? ''),
        );

        // Author
        if (!empty($data['author_id'])) {
            $post_data['post_author'] = absint($data['author_id']);
        }

        // Categories
        if (!empty($data['categories'])) {
            $post_data['post_category'] = array_map('absint', (array) $data['categories']);
        }

        // Create the post
        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Tags
        if (!empty($data['tags'])) {
            wp_set_post_tags($post_id, $data['tags']);
        }

        // Featured image from URL
        if (!empty($data['featured_image_url'])) {
            $attachment_id = $this->upload_image_from_url(
                $data['featured_image_url'],
                $post_id,
                $data['featured_image_alt'] ?? $data['title']
            );

            if ($attachment_id && !is_wp_error($attachment_id)) {
                set_post_thumbnail($post_id, $attachment_id);
            }
        }

        // Custom fields (meta)
        if (!empty($data['meta']) && is_array($data['meta'])) {
            foreach ($data['meta'] as $key => $value) {
                update_post_meta($post_id, sanitize_key($key), $value);
            }
        }

        // Mark as created by Ifrit
        update_post_meta($post_id, '_ifrit_source', 'ifrit-connector');
        update_post_meta($post_id, '_ifrit_created_at', current_time('c'));

        if (!empty($data['campaign_id'])) {
            update_post_meta($post_id, '_ifrit_campaign_id', sanitize_text_field($data['campaign_id']));
        }

        return array(
            'success' => true,
            'post_id' => $post_id,
            'url' => get_permalink($post_id),
            'edit_url' => get_edit_post_link($post_id, 'raw'),
            'status' => get_post_status($post_id),
        );
    }

    /**
     * Update an existing post
     * 
     * @param int $post_id Post ID
     * @param array $data Post data
     * @return array|WP_Error Response
     */
    public function update_post($post_id, $data)
    {
        $post_id = absint($post_id);

        // Check post exists
        $post = get_post($post_id);
        if (!$post) {
            return new WP_Error('not_found', 'Post not found', array('status' => 404));
        }

        // Prepare update data
        $update_data = array('ID' => $post_id);

        if (!empty($data['title'])) {
            $update_data['post_title'] = sanitize_text_field($data['title']);
        }

        if (!empty($data['content'])) {
            $update_data['post_content'] = wp_kses_post($data['content']);
        }

        if (!empty($data['status'])) {
            $update_data['post_status'] = sanitize_text_field($data['status']);
        }

        if (!empty($data['excerpt'])) {
            $update_data['post_excerpt'] = sanitize_textarea_field($data['excerpt']);
        }

        // Update the post
        $result = wp_update_post($update_data, true);

        if (is_wp_error($result)) {
            return $result;
        }

        // Update meta
        update_post_meta($post_id, '_ifrit_updated_at', current_time('c'));

        // Categories
        if (isset($data['categories'])) {
            wp_set_post_categories($post_id, array_map('absint', (array) $data['categories']));
        }

        // Tags
        if (isset($data['tags'])) {
            wp_set_post_tags($post_id, $data['tags']);
        }

        // Featured image
        if (!empty($data['featured_image_url'])) {
            $attachment_id = $this->upload_image_from_url(
                $data['featured_image_url'],
                $post_id,
                $data['featured_image_alt'] ?? get_the_title($post_id)
            );

            if ($attachment_id && !is_wp_error($attachment_id)) {
                set_post_thumbnail($post_id, $attachment_id);
            }
        }

        return array(
            'success' => true,
            'post_id' => $post_id,
            'url' => get_permalink($post_id),
            'status' => get_post_status($post_id),
        );
    }

    /**
     * Upload media from request
     * 
     * @param WP_REST_Request $request Request
     * @return array|WP_Error Response
     */
    public function upload_media($request)
    {
        $params = $request->get_json_params();

        // From URL
        if (!empty($params['url'])) {
            $attachment_id = $this->upload_image_from_url(
                $params['url'],
                $params['post_id'] ?? 0,
                $params['alt'] ?? ''
            );

            if (is_wp_error($attachment_id)) {
                return $attachment_id;
            }

            return array(
                'success' => true,
                'attachment_id' => $attachment_id,
                'url' => wp_get_attachment_url($attachment_id),
            );
        }

        // From base64
        if (!empty($params['data'])) {
            $attachment_id = $this->upload_image_from_base64(
                $params['data'],
                $params['filename'] ?? 'image.jpg',
                $params['post_id'] ?? 0,
                $params['alt'] ?? ''
            );

            if (is_wp_error($attachment_id)) {
                return $attachment_id;
            }

            return array(
                'success' => true,
                'attachment_id' => $attachment_id,
                'url' => wp_get_attachment_url($attachment_id),
            );
        }

        return new WP_Error('no_image', 'No image URL or data provided', array('status' => 400));
    }

    /**
     * Upload image from URL
     */
    private function upload_image_from_url($url, $post_id = 0, $alt = '')
    {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        // Download the image
        $tmp = download_url($url);

        if (is_wp_error($tmp)) {
            return $tmp;
        }

        // Get file info
        $file_array = array(
            'name' => basename(parse_url($url, PHP_URL_PATH)) ?: 'image.jpg',
            'tmp_name' => $tmp,
        );

        // Upload to media library
        $attachment_id = media_handle_sideload($file_array, $post_id);

        // Clean up temp file
        @unlink($tmp);

        if (is_wp_error($attachment_id)) {
            return $attachment_id;
        }

        // Set alt text
        if ($alt) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($alt));
        }

        return $attachment_id;
    }

    /**
     * Upload image from base64
     */
    private function upload_image_from_base64($data, $filename, $post_id = 0, $alt = '')
    {
        // Decode base64
        if (strpos($data, 'base64,') !== false) {
            $data = explode('base64,', $data)[1];
        }

        $decoded = base64_decode($data);

        if (!$decoded) {
            return new WP_Error('invalid_data', 'Invalid base64 data');
        }

        // Save to temp file
        $upload_dir = wp_upload_dir();
        $tmp_file = $upload_dir['basedir'] . '/' . wp_unique_filename($upload_dir['basedir'], $filename);

        file_put_contents($tmp_file, $decoded);

        // Get mime type
        $filetype = wp_check_filetype($filename);

        // Prepare attachment
        $attachment = array(
            'post_mime_type' => $filetype['type'],
            'post_title' => sanitize_file_name(pathinfo($filename, PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit',
        );

        // Insert attachment
        $attachment_id = wp_insert_attachment($attachment, $tmp_file, $post_id);

        if (is_wp_error($attachment_id)) {
            @unlink($tmp_file);
            return $attachment_id;
        }

        // Generate metadata
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $metadata = wp_generate_attachment_metadata($attachment_id, $tmp_file);
        wp_update_attachment_metadata($attachment_id, $metadata);

        // Set alt text
        if ($alt) {
            update_post_meta($attachment_id, '_wp_attachment_image_alt', sanitize_text_field($alt));
        }

        return $attachment_id;
    }
}
