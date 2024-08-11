<?php

header( "Content-Type: application/json" );

$json = json_decode(file_get_contents('php://input'), true);

if (is_null($json)) {
	exit_json([
		'success' => false,
		'content' => '请求出错。',
	]);
}

$parameters = $json["parameters"];

require_once 'init.php';

if (!empty($options["callback_api_key"])) {
	$bearer = $_SERVER['HTTP_AUTHORIZATION'];

	if (empty($bearer)) {
		exit_json([
			'success' => false,
			'content' => '请求未携带 Bearer Token。',
		]);
	}

	if ( str_starts_with( $bearer, 'Bearer ' ) ) {
		$bearer = substr($bearer, 7);
		if ($bearer != $options["callback_api_key"]) {
			exit_json([
				'success' => false,
				'content' => 'Bearer Token 错误。',
			]);
		}
	} else {
		exit_json([
			'success' => false,
			'content' => '你的请求有误',
		]);
	}
}

if (empty($json["function_name"])) {
	exit_json([
		'success' => false,
		'content' => '请求未携带函数名。',
	]);
}

switch ($json["function_name"]) {
	case "search":

		if (empty($parameters["keyword"])) {
			exit_json([
				'success' => false,
				'content' => '需要提供关键词。',
			]);
		}

		$args = [
			's' => sanitize_text_field($parameters["keyword"]),
			'post_type' => 'post',
			'posts_per_page' => 10
		];
		$query = new WP_Query($args);

		if ($query->have_posts()) {
			$content = "搜索到 " . $query->post_count . ' 个' . PHP_EOL;

			foreach ($query->posts as $post) {
				$content .= "文章 ID: " . $post->ID .
				            ", 链接: " . get_permalink($post->ID) .
				            ", 标题: " . $post->post_title .
				            ', 内容: '. $post->post_content . PHP_EOL;
			}

			exit_json([
				'success' => true,
				'content' => $content,
			]);

		} else {
			exit_json([
				'success' => true,
				'content' => '没有找到任何结果。',
			]);
		}

		break;
	case "get_post":
		$post_id = $parameters["post_id"];

		$post = get_post($post_id);
		if (!$post) {
			exit_json([
				'success' => true,
				'content' => '没有找到文章。',
			]);
		}


		$text = "文章 ID: " . $post_id;
		$text .= "\n\n标题: " . $post->post_title;
		$text .= "\n\n内容: " . $post->post_content;

		echo json_encode([
			'success' => true,
			'content' => $text,
		]);

		break;
	default:
		echo json_encode([
			'success' => false,
			'content' => '找不到对应的工具。',
		]);
		break;
}

function exit_json($data): void {
	exit(json_encode($data, JSON_UNESCAPED_UNICODE));
}


