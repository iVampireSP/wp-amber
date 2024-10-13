<?php

if ( ! defined( 'ABSPATH' ) ) {
	$p = dirname( __FILE__ ) . '/../../../wp-load.php';
	$p = realpath( $p );
	require_once($p);
}

/**
 * 读取 wp_chat 插件的选项
 */
function read_wp_chat_options() {
// 通常插件会有一个前缀来避免选项名冲突
	$option_name = 'wp_chat_options'; // 假设这是你的选项名称
	$options     = get_option( $option_name );

	if ( false === $options ) {
		return false;
	} else {
		return $options;
	}
}

$options = read_wp_chat_options();
if (!$options) {
	echo json_encode([
		'success' => false,
		'content' => '博客没有配置 WP Amber 插件。',
	]);
	exit;
}

if (empty($options['enable']) || $options['enable'] != 1) {
	echo json_encode([
		'success' => false,
		'content' => '博客没有启用 WP Amber 插件。',
	]);
}