<?php
/**
 * Plugin Name: Ifrit Connector
 * Plugin URI: https://github.com/your-repo/ifrit-connector
 * Description: Lightweight connector between WordPress and Ifrit dashboard. Enables analytics sync, content publishing, webhooks, and remote management.
 * Version: 1.0.0
 * Author: Ifrit Team
 * Author URI: https://ifrit.app
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: ifrit-connector
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('IFRIT_CONNECTOR_VERSION', '1.0.0');
define('IFRIT_CONNECTOR_PATH', plugin_dir_path(__FILE__));
define('IFRIT_CONNECTOR_URL', plugin_dir_url(__FILE__));
define('IFRIT_CONNECTOR_BASENAME', plugin_basename(__FILE__));

/**
 * Main Plugin Class
 */
class Ifrit_Connector
{

    /**
     * Single instance
     */
    private static $instance = null;

    /**
     * Get instance
     */
    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct()
    {
        $this->load_dependencies();
        $this->init_hooks();
    }

    /**
     * Load required files
     */
    private function load_dependencies()
    {
        require_once IFRIT_CONNECTOR_PATH . 'includes/class-rest-api.php';
        require_once IFRIT_CONNECTOR_PATH . 'includes/class-webhooks.php';
        require_once IFRIT_CONNECTOR_PATH . 'includes/class-analytics-bridge.php';
        require_once IFRIT_CONNECTOR_PATH . 'includes/class-content-receiver.php';
        require_once IFRIT_CONNECTOR_PATH . 'includes/class-remote-manager.php';

        if (is_admin()) {
            require_once IFRIT_CONNECTOR_PATH . 'admin/class-admin-settings.php';
        }
    }

    /**
     * Initialize hooks
     */
    private function init_hooks()
    {
        // Activation/Deactivation
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));

        // Initialize components
        add_action('init', array($this, 'init'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Webhook triggers
        add_action('publish_post', array($this, 'on_post_published'), 10, 2);
        add_action('save_post', array($this, 'on_post_saved'), 10, 3);
        add_action('delete_post', array($this, 'on_post_deleted'), 10, 1);
        add_action('transition_post_status', array($this, 'on_status_change'), 10, 3);
    }

    /**
     * Plugin activation
     */
    public function activate()
    {
        // Check PHP version
        if (version_compare(PHP_VERSION, '8.0.0', '<')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(
                'Ifrit Connector requires PHP 8.0 or higher. Your version: ' . PHP_VERSION,
                'Plugin Activation Error',
                array('back_link' => true)
            );
        }

        // Check WordPress version
        if (version_compare(get_bloginfo('version'), '6.0', '<')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die(
                'Ifrit Connector requires WordPress 6.0 or higher.',
                'Plugin Activation Error',
                array('back_link' => true)
            );
        }

        // Generate API token if not exists
        if (!get_option('ifrit_api_token')) {
            update_option('ifrit_api_token', wp_generate_password(64, false));
        }

        // Default settings (all prefixed with ifrit_)
        $defaults = array(
            'ifrit_dashboard_url' => '',
            'ifrit_webhooks_enabled' => true,
            'ifrit_analytics_sync_enabled' => true,
            'ifrit_content_receiver_enabled' => true,
            'ifrit_remote_management_enabled' => false,  // Disabled by default for security
        );

        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                update_option($key, $value);
            }
        }

        flush_rewrite_rules();
    }

    /**
     * Plugin deactivation
     */
    public function deactivate()
    {
        flush_rewrite_rules();
    }

    /**
     * Initialize plugin
     */
    public function init()
    {
        // Load text domain
        load_plugin_textdomain('ifrit-connector', false, dirname(IFRIT_CONNECTOR_BASENAME) . '/languages');

        // Initialize admin
        if (is_admin()) {
            new Ifrit_Admin_Settings();
        }
    }

    /**
     * Register REST API routes
     */
    public function register_rest_routes()
    {
        $rest_api = new Ifrit_REST_API();
        $rest_api->register_routes();
    }

    /**
     * Webhook: Post published
     */
    public function on_post_published($post_id, $post)
    {
        if (!get_option('ifrit_webhooks_enabled'))
            return;

        $webhooks = new Ifrit_Webhooks();
        $webhooks->send('post.published', array(
            'post_id' => $post_id,
            'title' => $post->post_title,
            'url' => get_permalink($post_id),
            'type' => $post->post_type,
            'author' => get_the_author_meta('display_name', $post->post_author),
        ));
    }

    /**
     * Webhook: Post saved
     */
    public function on_post_saved($post_id, $post, $update)
    {
        if (!get_option('ifrit_webhooks_enabled'))
            return;
        if ($post->post_status !== 'publish')
            return;
        if (!$update)
            return;  // New posts handled by publish hook

        $webhooks = new Ifrit_Webhooks();
        $webhooks->send('post.updated', array(
            'post_id' => $post_id,
            'title' => $post->post_title,
            'url' => get_permalink($post_id),
        ));
    }

    /**
     * Webhook: Post deleted
     */
    public function on_post_deleted($post_id)
    {
        if (!get_option('ifrit_webhooks_enabled'))
            return;

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'post')
            return;

        $webhooks = new Ifrit_Webhooks();
        $webhooks->send('post.deleted', array(
            'post_id' => $post_id,
            'title' => $post->post_title,
        ));
    }

    /**
     * Webhook: Status change
     */
    public function on_status_change($new_status, $old_status, $post)
    {
        if (!get_option('ifrit_webhooks_enabled'))
            return;
        if ($new_status === $old_status)
            return;

        $webhooks = new Ifrit_Webhooks();
        $webhooks->send('post.status_changed', array(
            'post_id' => $post->ID,
            'title' => $post->post_title,
            'old_status' => $old_status,
            'new_status' => $new_status,
        ));
    }

    /**
     * Get API token
     */
    public static function get_api_token()
    {
        return get_option('ifrit_api_token');
    }

    /**
     * Validate API token from request
     */
    public static function validate_token($request)
    {
        $token = $request->get_header('X-Ifrit-Token');

        if (empty($token)) {
            $token = $request->get_param('token');
        }

        if (empty($token)) {
            return false;
        }

        return hash_equals(self::get_api_token(), $token);
    }
}

// Initialize plugin
function ifrit_connector()
{
    return Ifrit_Connector::get_instance();
}

// Start the plugin
add_action('plugins_loaded', 'ifrit_connector');
