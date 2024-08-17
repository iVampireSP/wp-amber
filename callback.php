<?php

const COMMENTS_LIMIT = 5;
const POSTS_LIMIT = 5;

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
			'posts_per_page' => POSTS_LIMIT
		];
		$query = new WP_Query($args);

		if ($query->have_posts()) {
			$content = "搜索到 " . $query->post_count . ' 个' . PHP_EOL;

			foreach ($query->posts as $post) {
				// 获取评论
				$comments = get_post_comment($post->ID);

				$content .= "文章 ID: " . $post->ID .
				            ", 链接: " . get_permalink($post->ID) .
				            ", 标题: " . $post->post_title .
				            ', 内容: '. $post->post_content . PHP_EOL;

				if ($comments != "") {
					$content .= $comments . PHP_EOL;
				}
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

		// 获取评论
		$comments = get_post_comment($post->ID);

		$text = "文章 ID: " . $post_id;
		$text .= "\n\n标题: " . $post->post_title;
		$text .= "\n\n内容: " . $post->post_content;

		if ($comments != "") {
			$text .= "\n\n评论: " . PHP_EOL . $comments;
		}

		echo json_encode([
			'success' => true,
			'content' => $text,
		]);

		break;
	case "get_current_post_id":
	case "get_selected_text":
	case "close":
		echo json_encode([
			'success' => true,
			'stop_generation' => true,
			'content' => "",
		]);
		break;
	case "show":
	case "hide":
	case "change_title":
		echo json_encode([
			'success' => true,
			'content' => "",
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

function get_post_comment($post_id) {
	// 获取评论
	$comments = get_comments([
		'post_id' => $post_id,
		'status' => 'approve',
		'number' => COMMENTS_LIMIT,
	]);

	$comment_content = "";
	if ($comments) {
		$comment_content .= "评论: " . PHP_EOL;

		for ($i = 0; $i < count($comments); $i++) {
			$admin = user_can($comments[$i]->user_id, 'update_core');
			if ($admin) {
				$comment_content .= "博主";
			} else {
				$comment_content .= "用户";
			}

			$comment_content .= "评论 $i 的 ID: " . $comments[$i]->comment_ID .
			            ", 链接: " . get_comment_link($comments[$i]->comment_ID) .
			            ", 内容: " . $comments[$i]->comment_content . PHP_EOL;
		}
	}

	return $comment_content;
}
