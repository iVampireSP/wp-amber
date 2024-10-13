<?php
/*
Plugin Name: WPChat
Plugin URI: https://ivampiresp.com/2024/08/12/bring-llm-to-wordpress
Description: 让你的 WordPress 接入 Amber API
Version: 0.6.8
Author: iVampireSP.com / Twilight
Author URI: https://ivampiresp.com
*/

const WP_CHAT_VERSION = '0.6.8';

function wp_chat_menu(): void {
	add_options_page(
		'设置 WP Chat', // 页面标题
		'WP Chat', // 菜单标题
		'manage_options', // 能够访问此页面的用户权限
		'wp-chat-settings', // 菜单的唯一标识符
		'wp_chat_settings_page' // 显示页面内容的回调函数
	);
}

add_action( 'admin_menu', 'wp_chat_menu' );

function wp_chat_settings_page(): void {
	?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <p>你的站点的回调地址是 <code><?php echo esc_html(wp_chat_get_plugin_url()); ?>callback.php</code></p>
        <p>你的站点的工具发现地址是 <code><?php echo esc_html(wp_chat_get_plugin_url()); ?>discovery.php</code></p>
        <form method="post" action="options.php">
			<?php
			settings_fields( 'wp_chat_settings_group' ); // 定义设置字段组
			do_settings_sections( 'wp-chat-settings' ); // 输出设置部分
			submit_button();
			?>
        </form>
    </div>
	<?php
}


function wp_chat_settings_init(): void {
	register_setting(
		'wp_chat_settings_group', // 设置字段组
		'wp_chat_options', // 设置选项名称
		'wp_chat_sanitize' // 数据验证和清理函数
	);

	add_settings_section(
		'wp_chat_general_settings', // 设置部分ID
		'助理设置', // 标题
		'wp_chat_general_settings_callback', // 回调函数
		'wp-chat-settings' // 页面标识符
	);

	add_settings_field(
		'wp_chat_enable', // 字段ID
		'是否启用', // 标签
		'wp_chat_enable_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

	add_settings_field(
		'wp_chat_assistant_token', // 字段ID
		'助理 API 密钥（不需要写 sk-）', // 标签
		'wp_chat_assistant_token_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

	add_settings_field(
		'wp_chat_callback_api_key', // 字段ID
		'认证密钥（自定义）', // 标签
		'wp_chat_api_key_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

	add_settings_field(
		'wp_chat_assistant_name', // 字段ID
		'助理名称', // 标签
		'wp_chat_assistant_name_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

	add_settings_field(
		'wp_chat_welcome_message', // 字段ID
		'欢迎信息', // 标签
		'wp_chat_welcome_message_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

//	add_settings_field(
//		'wp_chat_message_cleared', // 字段ID
//		'清除消息记录后的信息', // 标签
//		'wp_chat_message_cleared_callback', // 回调函数
//		'wp-chat-settings', // 页面标识符
//		'wp_chat_general_settings' // 设置部分ID
//	);

	add_settings_field(
		'wp_chat_error_message', // 字段ID
		'错误信息', // 标签
		'wp_chat_error_message_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

//	add_settings_field(
//		'wp_chat_after_reset_message', // 字段ID
//		'重置会话后发送的信息', // 标签
//		'wp_chat_after_reset_message_callback', // 回调函数
//		'wp-chat-settings', // 页面标识符
//		'wp_chat_general_settings' // 设置部分ID
//	);

	add_settings_field(
		'wp_chat_button_css', // 字段ID
		'按钮 CSS 样式覆盖', // 标签
		'wp_chat_button_css_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);

	add_settings_field(
		'wp_chat_custom_css', // 字段ID
		'自定义 CSS 样式覆盖', // 标签
		'wp_chat_custom_css_callback', // 回调函数
		'wp-chat-settings', // 页面标识符
		'wp_chat_general_settings' // 设置部分ID
	);
}

add_action( 'admin_init', 'wp_chat_settings_init' );
function wp_chat_general_settings_callback(): void {
	echo '<p>设置 Leaflow Assistant</p>';
}

function wp_chat_enable_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label for="wp_chat_enable">
        <input type="checkbox" name="wp_chat_options[enable]" id="wp_chat_enable"
               value="1" <?php checked( isset( $options['enable'] ) && $options['enable'] == 1 ); ?>>
        启用
    </label>
	<?php
}

function wp_chat_assistant_token_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
        <input type="text" name="wp_chat_options[assistant_token]"
               value="<?php echo esc_attr( $options['assistant_token'] ?? '' ); ?>">
    </label>
	<?php
}

function wp_chat_assistant_name_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
        <input type="text" name="wp_chat_options[assistant_name]"
               value="<?php echo esc_attr( $options['assistant_name'] ?? '' ); ?>">
    </label>
	<?php
}

function wp_chat_welcome_message_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="wp_chat_options[welcome_message]"><?php echo esc_textarea( $options['welcome_message'] ?? '' ); ?></textarea>
    </label>
	<?php
}


function wp_chat_error_message_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="wp_chat_options[error_message]"><?php echo esc_textarea( $options['error_message'] ?? '' ); ?></textarea>
    </label>
	<?php
}

function wp_chat_button_css_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="wp_chat_options[button_css]"><?php echo esc_textarea( $options['button_css'] ?? '' ); ?></textarea>
    </label>
	<?php
}

function wp_chat_api_key_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
        <input type="text" name="wp_chat_options[callback_api_key]"
               value="<?php echo esc_attr( $options['callback_api_key'] ?? '' ); ?>">
    </label>
	<?php
}

function wp_chat_custom_css_callback(): void {
	$options = get_option( 'wp_chat_options' );
	?>
    <label>
       <textarea cols="40" rows="5"
                 name="wp_chat_options[wp_chat_custom_css]"><?php echo esc_textarea( $options['wp_chat_custom_css'] ?? '' ); ?></textarea>
    </label>
	<?php
}


function wp_chat_sanitize( $input ): array {
	$sanitized = array();

	if ( isset( $input['enable'] ) ) {
		$sanitized['enable'] = (int) $input['enable'];
	}

	if ( isset( $input['assistant_token'] ) ) {
		$sanitized['assistant_token'] = sanitize_text_field( $input['assistant_token'] );
	}

	if ( isset( $input['assistant_name'] ) ) {
		$sanitized['assistant_name'] = sanitize_text_field( $input['assistant_name'] );
	}

	if ( isset( $input['welcome_message'] ) ) {
		$sanitized['welcome_message'] = sanitize_textarea_field( $input['welcome_message'] );
	}

//	if ( isset( $input['message_cleared'] ) ) {
//		$sanitized['message_cleared'] = sanitize_textarea_field( $input['message_cleared'] );
//	}

	if ( isset( $input['error_message'] ) ) {
		$sanitized['error_message'] = sanitize_textarea_field( $input['error_message'] );
	}

//	if ( isset( $input['after_reset_message'] ) ) {
//		$sanitized['after_reset_message'] = sanitize_textarea_field( $input['after_reset_message'] );
//	}

	if ( isset( $input['button_css'] ) ) {
		$sanitized['button_css'] = sanitize_textarea_field( $input['button_css'] );
	}

	if ( isset( $input['callback_api_key'] ) ) {
		$sanitized['callback_api_key'] = sanitize_textarea_field( $input['callback_api_key'] );
	}

	if ( isset( $input['wp_chat_custom_css'] ) ) {
		$sanitized['wp_chat_custom_css'] = sanitize_textarea_field( $input['wp_chat_custom_css'] );
	}

	return $sanitized;
}

function wp_chat_get_options() {
	return get_option( 'wp_chat_options' );
}


// 获取插件URL路径
function wp_chat_get_plugin_url(): string {
	$plugin_file = __FILE__;
	$plugin_url  = plugin_dir_url( $plugin_file );

	// 确保路径以斜杠结尾
	if ( ! str_ends_with( $plugin_url, '/' ) ) {
		$plugin_url .= '/';
	}

	return $plugin_url;
}

function wp_chat_add_script_to_footer(): void {
	$options = wp_chat_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 ) {
		return;
	}

	$config = [];

	if ( ! empty( $options['assistant_name'] ) ) {
		$config['assistant_name'] = $options['assistant_name'];
	}

	if ( ! empty( $options['welcome_message'] ) ) {
		$config['welcome_message'] = $options['welcome_message'];
	}

//    if (!empty($options['message_cleared'])) {
//        $config['message_cleared'] = $options['message_cleared'];
//    }

	if ( ! empty( $options['error_message'] ) ) {
		$config['error_message'] = $options['error_message'];
	}
//
//    if (!empty($options['after_reset_message'])) {
//        $config['after_reset_message'] = $options['after_reset_message'];
//    }

	if ( ! empty( $options['button_css'] ) ) {
		$config['button_css'] = $options['button_css'];
	}

	$j = json_encode( $config, JSON_UNESCAPED_UNICODE );

	$plugin_dir = wp_chat_get_plugin_url();
	$v          = WP_CHAT_VERSION;
	echo <<<EOF
<script src="{$plugin_dir}embed.js?t={$v}"></script>
<script src="{$plugin_dir}markdown.js?t={$v}"></script>
    <script>
if (window.wp_chat === undefined) {
    window.wp_chat = new LeaflowAmber($j)
    window.wp_chat.init()
}
    </script>
EOF;
}

add_action( 'wp_footer', 'wp_chat_add_script_to_footer', 999 ); // 将回调函数添加到 wp_footer 钩子


function wp_chat_add_style_to_header(): void {
	$options = wp_chat_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 || empty( $options['wp_chat_custom_css'] ) ) {
		return;
	}

	echo '<style>' . $options['wp_chat_custom_css'] . '</style>';
}

add_action( 'wp_head', 'wp_chat_add_style_to_header', 999 );

function wp_chat_add_post_id_to_comment_form( $comment_registration ) {


	$options = wp_chat_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 ) {
		return $comment_registration;
	}

	global $post;
	$post_id = $post->ID;
	echo '<div data-amber-post-id="' . esc_html($post_id) . '"  data-amber-post-id-' . esc_html($post_id) . '-answered="false"  style="display: none;"></div>';

	remove_filter( current_filter(), __FUNCTION__ );

	return $comment_registration;
}

add_action( 'comment_form_before', function () {
	add_filter( 'pre_option_comment_registration', 'wp_chat_add_post_id_to_comment_form' );
} );
// add link style to header
function wp_chat_style_link_to_header() {
	$options = wp_chat_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 ) {
		return;
	}

	$plugin_dir = wp_chat_get_plugin_url();
	$v          = WP_CHAT_VERSION;
    $url = $plugin_dir . 'wpchat.css?t=' . $v;

	echo '<link rel="stylesheet" type="text/css" href="' . esc_url( $url ) . '" />' . "\n";
}
add_action( 'wp_head', 'wp_chat_style_link_to_header' );

?>
