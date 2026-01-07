<?php
/**
 * Ifrit Remote Manager
 * 
 * Handles remote plugin installation and site management.
 * NOTE: Disabled by default for security - must be explicitly enabled.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_Remote_Manager
{

    /**
     * Install a plugin from WordPress.org
     * 
     * @param array $data Plugin data
     * @return array|WP_Error Response
     */
    public function install_plugin($data)
    {
        if (empty($data['slug'])) {
            return new WP_Error('missing_slug', 'Plugin slug is required', array('status' => 400));
        }

        $slug = sanitize_title($data['slug']);
        $activate = !empty($data['activate']);

        // Check if already installed
        if (!function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $installed_plugins = get_plugins();
        $plugin_file = null;

        foreach ($installed_plugins as $path => $plugin) {
            if (strpos($path, $slug . '/') === 0 || $path === $slug . '.php') {
                $plugin_file = $path;
                break;
            }
        }

        // Already installed
        if ($plugin_file) {
            if ($activate && !is_plugin_active($plugin_file)) {
                $result = activate_plugin($plugin_file);
                if (is_wp_error($result)) {
                    return $result;
                }
                return array(
                    'success' => true,
                    'message' => 'Plugin was already installed, now activated',
                    'plugin' => $plugin_file,
                    'activated' => true,
                );
            }

            return array(
                'success' => true,
                'message' => 'Plugin is already installed',
                'plugin' => $plugin_file,
                'active' => is_plugin_active($plugin_file),
            );
        }

        // Install from WordPress.org
        require_once ABSPATH . 'wp-admin/includes/class-wp-upgrader.php';
        require_once ABSPATH . 'wp-admin/includes/plugin-install.php';

        // Get plugin info from WordPress.org
        $api = plugins_api('plugin_information', array(
            'slug' => $slug,
            'fields' => array('sections' => false),
        ));

        if (is_wp_error($api)) {
            return new WP_Error(
                'plugin_not_found',
                'Plugin not found on WordPress.org',
                array('status' => 404)
            );
        }

        // Install the plugin using silent upgrader skin
        $upgrader = new Plugin_Upgrader(new Ifrit_Silent_Upgrader_Skin());
        $install_result = $upgrader->install($api->download_link);

        if (is_wp_error($install_result)) {
            return $install_result;
        }

        if ($install_result === false) {
            return new WP_Error('install_failed', 'Plugin installation failed', array('status' => 500));
        }

        // Get the plugin file path
        $plugin_file = $upgrader->plugin_info();

        // Activate if requested
        if ($activate && $plugin_file) {
            $activation_result = activate_plugin($plugin_file);
            if (is_wp_error($activation_result)) {
                return array(
                    'success' => true,
                    'message' => 'Plugin installed but activation failed',
                    'plugin' => $plugin_file,
                    'activated' => false,
                    'activation_error' => $activation_result->get_error_message(),
                );
            }
        }

        return array(
            'success' => true,
            'message' => 'Plugin installed successfully',
            'plugin' => $plugin_file,
            'activated' => $activate && $plugin_file ? is_plugin_active($plugin_file) : false,
        );
    }

    /**
     * Activate an installed plugin
     * 
     * @param string $plugin_path Plugin path
     * @return array|WP_Error Response
     */
    public function activate_plugin($plugin_path)
    {
        if (!function_exists('activate_plugin')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        $result = activate_plugin($plugin_path);

        if (is_wp_error($result)) {
            return $result;
        }

        return array(
            'success' => true,
            'message' => 'Plugin activated',
            'plugin' => $plugin_path,
        );
    }

    /**
     * Deactivate a plugin
     * 
     * @param string $plugin_path Plugin path
     * @return array Response
     */
    public function deactivate_plugin($plugin_path)
    {
        if (!function_exists('deactivate_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        deactivate_plugins($plugin_path);

        return array(
            'success' => true,
            'message' => 'Plugin deactivated',
            'plugin' => $plugin_path,
        );
    }
}

/**
 * Silent upgrader skin (no output)
 * Note: Must be defined AFTER class-wp-upgrader.php is loaded
 * This is safe because this file is only included when needed
 */
if (class_exists('WP_Upgrader_Skin')) {
    class Ifrit_Silent_Upgrader_Skin extends WP_Upgrader_Skin
    {
        public function feedback($string, ...$args)
        {
        }
        public function header()
        {
        }
        public function footer()
        {
        }
        public function error($errors)
        {
        }
    }
}

