<?php
if ( ! defined( 'ABSPATH' ) ) {
	$p = dirname( __FILE__ ) . '/../../../wp-load.php';
	$p = realpath( $p );
	require_once($p);
}


header( "Content-Type: application/json" );

$plugin_dir = leaflow_amber_get_plugin_url();

$blog_name = get_bloginfo( 'name' );
$blog_description = get_bloginfo( 'description' );


$func = [
	"name"         => $blog_name . ' 的工具',
	"description"  => $blog_description,
	"homepage_url" => get_home_url(),
	"callback_url" => $plugin_dir . 'callback.php',
	"functions" => [
		[
			"name" => "search",
			"description" => "搜索 {$blog_name} 的博客，当用户要搜索时，你必须使用此工具",
			"parameters" => (object) [
				"type" => "object",
				"properties" => [
					"keyword" => [
						"type" => "string",
						"description" => "搜索关键词"
					]
				]
			],
			"required" => (array) [
				"keyword"
			]
		],
		[
			"name" => "get_post",
			"description" => "根据 search 工具的结果，获取一篇文章(需要你传入正确的文章 ID 为post_id)",
			"parameters" => (object) [
				"type" => "object",
				"properties" => [
					"post_id" => [
						"type" => "string",
						"description" => "文章 ID"
					]
				]
			],
			"required" => (array) [
				"post_id"
			]
		],

	]
];

echo json_encode( $func, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );
