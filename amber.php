<?php
/*
Plugin Name: Amber
Plugin URI: https://ivampiresp.com
Description: 让你的 WordPress 接入 Amber API
Version: 0.6.7-patch-6
Author: iVampireSP.com / Twilight
Author URI: https://ivampiresp.com
*/

const LEAFLOW_AMBER_VERSION = '0.6.7-patch-6';

function amber_menu(): void {
	add_options_page(
		'设置 Amber 助理', // 页面标题
		'Amber', // 菜单标题
		'manage_options', // 能够访问此页面的用户权限
		'amber-settings', // 菜单的唯一标识符
		'amber_settings_page' // 显示页面内容的回调函数
	);
}

add_action( 'admin_menu', 'amber_menu' );

function amber_settings_page(): void {
	?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <p>你的站点的回调地址是 <code><?php echo leaflow_amber_get_plugin_url(); ?>callback.php</code></p>
        <p>你的站点的工具发现地址是 <code><?php echo leaflow_amber_get_plugin_url(); ?>discovery.php</code></p>
        <form method="post" action="options.php">
			<?php
			settings_fields( 'amber_settings_group' ); // 定义设置字段组
			do_settings_sections( 'amber-settings' ); // 输出设置部分
			submit_button();
			?>
        </form>
    </div>
	<?php
}


function amber_settings_init(): void {
	register_setting(
		'amber_settings_group', // 设置字段组
		'amber_options', // 设置选项名称
		'amber_sanitize' // 数据验证和清理函数
	);

	add_settings_section(
		'amber_general_settings', // 设置部分ID
		'助理设置', // 标题
		'amber_general_settings_callback', // 回调函数
		'amber-settings' // 页面标识符
	);

	add_settings_field(
		'amber_enable', // 字段ID
		'是否启用', // 标签
		'amber_enable_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

	add_settings_field(
		'amber_assistant_token', // 字段ID
		'助理共享密钥', // 标签
		'amber_assistant_token_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

	add_settings_field(
		'amber_callback_api_key', // 字段ID
		'认证密钥（自定义）', // 标签
		'amber_api_key_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

	add_settings_field(
		'amber_assistant_name', // 字段ID
		'助理名称', // 标签
		'amber_assistant_name_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

	add_settings_field(
		'amber_welcome_message', // 字段ID
		'欢迎信息', // 标签
		'amber_welcome_message_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

//	add_settings_field(
//		'amber_message_cleared', // 字段ID
//		'清除消息记录后的信息', // 标签
//		'amber_message_cleared_callback', // 回调函数
//		'amber-settings', // 页面标识符
//		'amber_general_settings' // 设置部分ID
//	);

	add_settings_field(
		'amber_error_message', // 字段ID
		'错误信息', // 标签
		'amber_error_message_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

//	add_settings_field(
//		'amber_after_reset_message', // 字段ID
//		'重置会话后发送的信息', // 标签
//		'amber_after_reset_message_callback', // 回调函数
//		'amber-settings', // 页面标识符
//		'amber_general_settings' // 设置部分ID
//	);

	add_settings_field(
		'amber_button_css', // 字段ID
		'按钮 CSS 样式覆盖', // 标签
		'amber_button_css_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);

	add_settings_field(
		'amber_custom_css', // 字段ID
		'自定义 CSS 样式覆盖', // 标签
		'amber_custom_css_callback', // 回调函数
		'amber-settings', // 页面标识符
		'amber_general_settings' // 设置部分ID
	);
}

add_action( 'admin_init', 'amber_settings_init' );
function amber_general_settings_callback(): void {
	echo '<p>设置 Leaflow Assistant</p>';
}

function amber_enable_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label for="amber_enable">
        <input type="checkbox" name="amber_options[enable]" id="amber_enable"
               value="1" <?php checked( isset( $options['enable'] ) && $options['enable'] == 1 ); ?>>
        启用
    </label>
	<?php
}

function amber_assistant_token_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
        <input type="text" name="amber_options[assistant_token]"
               value="<?php echo esc_attr( $options['assistant_token'] ?? '' ); ?>">
    </label>
	<?php
}

function amber_assistant_name_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
        <input type="text" name="amber_options[assistant_name]"
               value="<?php echo esc_attr( $options['assistant_name'] ?? '' ); ?>">
    </label>
	<?php
}

function amber_welcome_message_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="amber_options[welcome_message]"><?php echo esc_textarea( $options['welcome_message'] ?? '' ); ?></textarea>
    </label>
	<?php
}


function amber_error_message_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="amber_options[error_message]"><?php echo esc_textarea( $options['error_message'] ?? '' ); ?></textarea>
    </label>
	<?php
}

function amber_button_css_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
<textarea cols="40" rows="5"
          name="amber_options[button_css]"><?php echo esc_textarea( $options['button_css'] ?? '' ); ?></textarea>
    </label>
	<?php
}

function amber_api_key_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
        <input type="text" name="amber_options[callback_api_key]"
               value="<?php echo esc_attr( $options['callback_api_key'] ?? '' ); ?>">
    </label>
	<?php
}

function amber_custom_css_callback(): void {
	$options = get_option( 'amber_options' );
	?>
    <label>
       <textarea cols="40" rows="5"
                 name="amber_options[amber_custom_css]"><?php echo esc_textarea( $options['amber_custom_css'] ?? '' ); ?></textarea>
    </label>
	<?php
}


function amber_sanitize( $input ): array {
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

	if ( isset( $input['amber_custom_css'] ) ) {
		$sanitized['amber_custom_css'] = sanitize_textarea_field( $input['amber_custom_css'] );
	}

	return $sanitized;
}

function amber_get_options() {
	return get_option( 'amber_options' );
}


// 获取插件URL路径
function leaflow_amber_get_plugin_url(): string {
	$plugin_file = __FILE__;
	$plugin_url  = plugin_dir_url( $plugin_file );

	// 确保路径以斜杠结尾
	if ( ! str_ends_with( $plugin_url, '/' ) ) {
		$plugin_url .= '/';
	}

	return $plugin_url;
}

function amber_add_script_to_footer(): void {
	$options = amber_get_options();

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

	$plugin_dir = leaflow_amber_get_plugin_url();
	$v          = LEAFLOW_AMBER_VERSION;
	echo <<<EOF
<script src="{$plugin_dir}embed.js?t={$v}"></script>
<script src="{$plugin_dir}markdown.js?t={$v}"></script>
    <script>
if (window.leaflow_amber === undefined) {
    window.leaflow_amber = new LeaflowAmber($j)
    window.leaflow_amber.init()
}
    </script>
EOF;
}

add_action( 'wp_footer', 'amber_add_script_to_footer', 999 ); // 将回调函数添加到 wp_footer 钩子


function amber_add_style_to_header(): void {
	$options = amber_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 || empty( $options['amber_custom_css'] ) ) {
		return;
	}

	echo '<style>' . $options['amber_custom_css'] . '</style>';
}

add_action( 'wp_head', 'amber_add_style_to_header', 999 );

function amber_add_post_id_to_comment_form( $comment_registration ) {


	$options = amber_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 ) {
		return $comment_registration;
	}

	global $post;
	$post_id = $post->ID;
	echo '<div data-amber-post-id="' . $post_id . '"  data-amber-post-id-' . $post_id . '-answered="false"  style="display: none;"></div>';

	remove_filter( current_filter(), __FUNCTION__ );

	return $comment_registration;
}

add_action( 'comment_form_before', function () {
	add_filter( 'pre_option_comment_registration', 'amber_add_post_id_to_comment_form' );
} );
// add link style to header
function amber_style_link_to_header() {
	$options = amber_get_options();

	// if not enable
	if ( empty( $options['enable'] ) || $options['enable'] != 1 ) {
		return;
	}

	$plugin_dir = leaflow_amber_get_plugin_url();
	$v          = LEAFLOW_AMBER_VERSION;
    $url = $plugin_dir . 'amber.css?t=' . $v;

	echo '<link rel="stylesheet" type="text/css" href="' . esc_url( $url ) . '" />' . "\n";
}
add_action( 'wp_head', 'amber_style_link_to_header' );

?>
