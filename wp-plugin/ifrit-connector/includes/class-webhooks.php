<?php
/**
 * Ifrit Webhooks
 * 
 * Sends webhook notifications to Ifrit dashboard.
 * 
 * @package Ifrit_Connector
 */

if (!defined('ABSPATH')) {
    exit;
}

class Ifrit_Webhooks
{

    /**
     * Send webhook to Ifrit
     * 
     * @param string $event Event name
     * @param array $data Event data
     * @return bool Success status
     */
    public function send($event, $data)
    {
        $webhook_url = get_option('ifrit_webhook_url');

        if (empty($webhook_url)) {
            return false;
        }

        $payload = array(
            'event' => $event,
            'site' => array(
                'url' => home_url(),
                'name' => get_bloginfo('name'),
            ),
            'data' => $data,
            'timestamp' => current_time('c'),
        );

        $response = wp_remote_post($webhook_url, array(
            'timeout' => 10,
            'headers' => array(
                'Content-Type' => 'application/json',
                'X-Ifrit-Event' => $event,
                'X-Ifrit-Site' => home_url(),
                'X-Ifrit-Signature' => $this->generate_signature($payload),
            ),
            'body' => wp_json_encode($payload),
        ));

        if (is_wp_error($response)) {
            $this->log_error($event, $response->get_error_message());
            return false;
        }

        $code = wp_remote_retrieve_response_code($response);

        if ($code < 200 || $code >= 300) {
            $this->log_error($event, "HTTP $code response");
            return false;
        }

        return true;
    }

    /**
     * Generate HMAC signature for webhook payload
     */
    private function generate_signature($payload)
    {
        $secret = Ifrit_Connector::get_api_token();
        $data = wp_json_encode($payload);
        return hash_hmac('sha256', $data, $secret);
    }

    /**
     * Log webhook error
     */
    private function log_error($event, $message)
    {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("[Ifrit Webhook] Failed to send '$event': $message");
        }
    }

    /**
     * Test webhook connection
     */
    public function test()
    {
        return $this->send('test', array(
            'message' => 'Webhook test from ' . home_url(),
        ));
    }
}
