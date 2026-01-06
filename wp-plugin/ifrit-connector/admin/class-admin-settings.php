<?php
/**
 * Ifrit Admin Settings
 * 
 * WordPress admin settings page for Ifrit Connector.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_Admin_Settings
{

    /**
     * Constructor
     */
    public function __construct()
    {
        add_action('admin_menu', array($this, 'add_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_ifrit_test_webhook', array($this, 'test_webhook'));
        add_action('wp_ajax_ifrit_regenerate_token', array($this, 'regenerate_token'));
    }

    /**
     * Add admin menu
     */
    public function add_menu()
    {
        add_options_page(
            __('Ifrit Connector', 'ifrit-connector'),
            __('Ifrit Connector', 'ifrit-connector'),
            'manage_options',
            'ifrit-connector',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings()
    {
        register_setting('ifrit_settings', 'ifrit_dashboard_url', array(
            'sanitize_callback' => 'esc_url_raw',
        ));
        register_setting('ifrit_settings', 'ifrit_webhook_url', array(
            'sanitize_callback' => 'esc_url_raw',
        ));
        register_setting('ifrit_settings', 'webhooks_enabled', array(
            'sanitize_callback' => 'rest_sanitize_boolean',
        ));
        register_setting('ifrit_settings', 'analytics_sync_enabled', array(
            'sanitize_callback' => 'rest_sanitize_boolean',
        ));
        register_setting('ifrit_settings', 'content_receiver_enabled', array(
            'sanitize_callback' => 'rest_sanitize_boolean',
        ));
        register_setting('ifrit_settings', 'remote_management_enabled', array(
            'sanitize_callback' => 'rest_sanitize_boolean',
        ));
    }

    /**
     * Render settings page
     */
    public function render_settings_page()
    {
        $token = Ifrit_Connector::get_api_token();
        $site_url = home_url();
        $api_endpoint = rest_url('ifrit/v1/');
        ?>
        <div class="wrap">
            <h1>
                <?php echo esc_html(get_admin_page_title()); ?>
            </h1>

            <div class="ifrit-card"
                style="background: #fff; padding: 20px; margin: 20px 0; border: 1px solid #ccd0d4; border-radius: 4px;">
                <h2 style="margin-top: 0;">🔗 Connection Details</h2>
                <p>Use these details to connect this site to your Ifrit dashboard:</p>

                <table class="form-table">
                    <tr>
                        <th>Site URL</th>
                        <td>
                            <code
                                style="display: inline-block; padding: 8px 12px; background: #f0f0f1; border-radius: 4px; font-size: 14px;"><?php echo esc_html($site_url); ?></code>
                        </td>
                    </tr>
                    <tr>
                        <th>API Endpoint</th>
                        <td>
                            <code
                                style="display: inline-block; padding: 8px 12px; background: #f0f0f1; border-radius: 4px; font-size: 14px;"><?php echo esc_html($api_endpoint); ?></code>
                        </td>
                    </tr>
                    <tr>
                        <th>API Token</th>
                        <td>
                            <code id="ifrit-token"
                                style="display: inline-block; padding: 8px 12px; background: #f0f0f1; border-radius: 4px; font-size: 14px; max-width: 400px; overflow: hidden; text-overflow: ellipsis;"><?php echo esc_html($token); ?></code>
                            <button type="button" class="button"
                                onclick="navigator.clipboard.writeText('<?php echo esc_js($token); ?>'); this.textContent='Copied!';">Copy</button>
                            <button type="button" class="button" id="regenerate-token">Regenerate</button>
                        </td>
                    </tr>
                </table>
            </div>

            <form method="post" action="options.php">
                <?php settings_fields('ifrit_settings'); ?>

                <h2>⚙️ Settings</h2>

                <table class="form-table">
                    <tr>
                        <th>
                            <?php _e('Ifrit Dashboard URL', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <input type="url" name="ifrit_dashboard_url"
                                value="<?php echo esc_attr(get_option('ifrit_dashboard_url')); ?>" class="regular-text"
                                placeholder="https://your-ifrit-instance.com">
                            <p class="description">
                                <?php _e('Your Ifrit dashboard URL for connecting back.', 'ifrit-connector'); ?>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <th>
                            <?php _e('Webhook URL', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <input type="url" name="ifrit_webhook_url"
                                value="<?php echo esc_attr(get_option('ifrit_webhook_url')); ?>" class="regular-text"
                                placeholder="https://your-ifrit-instance.com/api/webhooks/wordpress">
                            <button type="button" class="button" id="test-webhook">Test Webhook</button>
                            <p class="description">
                                <?php _e('URL where event notifications will be sent.', 'ifrit-connector'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <h2>🔧 Features</h2>

                <table class="form-table">
                    <tr>
                        <th>
                            <?php _e('Webhooks', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="webhooks_enabled" value="1" <?php checked(get_option('webhooks_enabled', true)); ?>>
                                <?php _e('Send webhook notifications when posts are published, updated, or deleted', 'ifrit-connector'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>
                            <?php _e('Analytics Sync', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="analytics_sync_enabled" value="1" <?php checked(get_option('analytics_sync_enabled', true)); ?>>
                                <?php _e('Allow Ifrit to fetch analytics data (from Site Kit or WordPress stats)', 'ifrit-connector'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>
                            <?php _e('Content Receiver', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="content_receiver_enabled" value="1" <?php checked(get_option('content_receiver_enabled', true)); ?>>
                                <?php _e('Allow Ifrit to publish and update content on this site', 'ifrit-connector'); ?>
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>
                            <?php _e('Remote Management', 'ifrit-connector'); ?>
                        </th>
                        <td>
                            <label>
                                <input type="checkbox" name="remote_management_enabled" value="1" <?php checked(get_option('remote_management_enabled', false)); ?>>
                                <?php _e('Allow Ifrit to install plugins remotely', 'ifrit-connector'); ?>
                            </label>
                            <p class="description" style="color: #d63638;">
                                <?php _e('⚠️ Security sensitive: Only enable if you trust your Ifrit instance completely.', 'ifrit-connector'); ?>
                            </p>
                        </td>
                    </tr>
                </table>

                <?php submit_button(); ?>
            </form>

            <h2>📚 API Endpoints</h2>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Endpoint</th>
                        <th>Method</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><code>/ifrit/v1/health</code></td>
                        <td>GET</td>
                        <td>Health check (public)</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/site</code></td>
                        <td>GET</td>
                        <td>Site information</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/analytics</code></td>
                        <td>GET</td>
                        <td>Analytics data (Site Kit + WP stats)</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/posts</code></td>
                        <td>POST</td>
                        <td>Create new post</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/posts/{id}</code></td>
                        <td>PUT</td>
                        <td>Update existing post</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/media</code></td>
                        <td>POST</td>
                        <td>Upload media (URL or base64)</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/plugins</code></td>
                        <td>GET</td>
                        <td>List installed plugins</td>
                    </tr>
                    <tr>
                        <td><code>/ifrit/v1/plugins/install</code></td>
                        <td>POST</td>
                        <td>Install plugin (requires remote management)</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <script>
            jQuery(document).ready(function ($) {
                $('#test-webhook').on('click', function () {
                    var button = $(this);
                    button.text('Testing...').prop('disabled', true);

                    $.post(ajaxurl, { action: 'ifrit_test_webhook' }, function (response) {
                        if (response.success) {
                            button.text('✓ Success!');
                        } else {
                            button.text('✗ Failed');
                            alert(response.data || 'Webhook test failed');
                        }
                        setTimeout(function () {
                            button.text('Test Webhook').prop('disabled', false);
                        }, 2000);
                    });
                });

                $('#regenerate-token').on('click', function () {
                    if (!confirm('Are you sure? This will invalidate the current token.')) return;

                    var button = $(this);
                    button.text('Regenerating...').prop('disabled', true);

                    $.post(ajaxurl, { action: 'ifrit_regenerate_token' }, function (response) {
                        if (response.success) {
                            $('#ifrit-token').text(response.data.token);
                            button.text('✓ Done');
                        } else {
                            button.text('✗ Failed');
                        }
                        setTimeout(function () {
                            button.text('Regenerate').prop('disabled', false);
                        }, 2000);
                    });
                });
            });
        </script>
        <?php
    }

    /**
     * AJAX: Test webhook
     */
    public function test_webhook()
    {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }

        $webhooks = new Ifrit_Webhooks();
        $result = $webhooks->test();

        if ($result) {
            wp_send_json_success('Webhook test sent');
        } else {
            wp_send_json_error('Failed to send webhook');
        }
    }

    /**
     * AJAX: Regenerate token
     */
    public function regenerate_token()
    {
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }

        $new_token = wp_generate_password(64, false);
        update_option('ifrit_api_token', $new_token);

        wp_send_json_success(array('token' => $new_token));
    }
}
