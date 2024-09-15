<?php

// 获取 URI
$uri = $_SERVER['REQUEST_URI'];

$script_filename = $_SERVER['SCRIPT_FILENAME'];
$script_filename = substr( $script_filename, strlen( dirname( __FILE__ ) ) );
$script_filename = str_replace( '\\', '/', $script_filename );

$position = strpos( $uri, $script_filename );

if ( $position !== false ) {
	$api_path = substr( $uri, $position + strlen( $script_filename ) );
} else {
	je( [
		'success' => false,
		'content' => '未提供路径。',
	] );
	exit();
}

$paths = explode( '/', $api_path );
array_shift( $paths );
const AMBER_URL = "https://amber-api.leaflow.cn/api/v1";

$json = [];
// 如果请求是 POST
if ( $_SERVER['REQUEST_METHOD'] === 'POST' ) {
	$json = json_decode( file_get_contents( 'php://input' ), true );

	if ( is_null( $json ) ) {
		je( [
			'success' => false,
			'content' => '请求出错。',
		] );
		exit();
	}
}


require_once 'init.php';

session_start();

const CACHE_GROUP = "amber";
const LIMIT_COUNT = 10;

const SESSION_GUEST_ID_KEY = "amber_guest_id";

function leaflow_amber_get_ip_address() {
	foreach (
		[
			'HTTP_CLIENT_IP',
			'HTTP_X_FORWARDED_FOR',
			'HTTP_X_FORWARDED',
			'HTTP_X_CLUSTER_CLIENT_IP',
			'HTTP_FORWARDED_FOR',
			'HTTP_FORWARDED',
			'REMOTE_ADDR'
		] as $key
	) {
		if ( array_key_exists( $key, $_SERVER ) === true ) {
			foreach ( explode( ',', $_SERVER[ $key ] ) as $ip ) {
				$ip = trim( $ip );

				if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) !== false ) {
					return $ip;
				}
			}
		}
	}

	return $_SERVER['REMOTE_ADDR'];
}

define( "CLIENT_IP", leaflow_amber_get_ip_address() );

// 获取缓存
function leaflow_amber_cache_get( $key ): int {
	$cache = wp_cache_get( $key, CACHE_GROUP );

	// 转换成 int，如果不能转换，则 0
	if ( is_numeric( $cache ) ) {
		return intval( $cache );
	} else {
		// 重新设置缓存
		wp_cache_set( $key, 0, CACHE_GROUP, 60 );

		return 0;
	}
}

// 获取用户 ip 在 1 分钟时间内的请求次数
function leaflow_amber_get_ip_count(): int {
	return leaflow_amber_cache_get( CLIENT_IP );
}

// count + 1
function leaflow_amber_cache_incr() {
	$c = leaflow_amber_cache_get( CLIENT_IP ) + 1;

	wp_cache_set( CLIENT_IP, $c, CACHE_GROUP, 60 );
}

// -1
function leaflow_amber_cache_decr() {
	$cache = leaflow_amber_cache_get( CLIENT_IP );

	if ( $cache > 0 ) {
		$cache = $cache - 1;
		wp_cache_set( CLIENT_IP, $cache, CACHE_GROUP, 60 );
	}
}

if ( leaflow_amber_get_ip_count() > LIMIT_COUNT ) {
	exit_json( [
		'success' => false,
		'content' => '你请求的太频繁了，请稍后再试。',
	] );
}

function je( $data ): void {
	echo json_encode( $data, JSON_UNESCAPED_UNICODE );
}


leaflow_amber_cache_incr();

if ( isset( $paths[0] ) && $paths[0] == 'stream' ) {
	ob_end_clean();

	set_time_limit(60);

	ini_set('output_buffering', 'off');
	ini_set('zlib.output_compression', false);
	header( 'Content-Type: text/event-stream' );
	header( 'Cache-Control: no-cache' );
	header( 'Connection: keep-alive' );
	header( 'X-Accel-Buffering: no' );
	ob_implicit_flush( 1 );

	// 先发一条 started
	echo "event: started\n";
	echo "data: started\n\n";
	ob_flush();
	flush();

	$sse_url = AMBER_URL . $api_path;

	$ch = curl_init( $sse_url );

	// 设置对话中的 X-User-IP
	curl_setopt( $ch, CURLOPT_HTTPHEADER, [
		'X-User-IP: ' . CLIENT_IP,
	] );

	curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
	curl_setopt( $ch, CURLOPT_WRITEFUNCTION, function ( $ch, $data ) {
		// 每次接收到数据时，立即将其发送给客户端
		echo $data;
		ob_flush();
		flush();

		return strlen( $data );
	} );

	curl_exec( $ch );

	if ( curl_errno( $ch ) ) {
		echo 'Error:' . curl_error( $ch );
	}

	curl_close( $ch );
} else {
	$json['assistant_key'] = $options['assistant_token'];
	$json['guest_id']        = $_SESSION[ SESSION_GUEST_ID_KEY ] ?? generate_guest_id();

	// 如果是 GET, 则解析 url 参数，将 assistant token 放入请求中
	if ( $_SERVER['REQUEST_METHOD'] === 'GET' ) {
		// parse url
		$url_parts = parse_url( $api_path );
		// 获取参数
		$query = $url_parts['query'] ?? '';
		parse_str( $query, $params );
		// 添加参数，然后重新拼接
		$api_path = $url_parts['path'] . '?' . http_build_query( array_merge( $params, $json ) );
	}

	echo proxy_request( AMBER_URL . $api_path, $json, $_SERVER['REQUEST_METHOD'] );
}

// 释放
leaflow_amber_cache_decr();

function proxy_request( $url, $data = null, $method = 'GET', $headers = [] ) {
	$ch = curl_init();
	curl_setopt( $ch, CURLOPT_URL, $url );
	curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
	curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
	curl_setopt( $ch, CURLOPT_HEADER, false );
	curl_setopt( $ch, CURLOPT_SSL_VERIFYPEER, false );

	if ( $method == 'POST' ) {
		curl_setopt( $ch, CURLOPT_POST, true );

		if ( ! is_null( $data ) ) {
			curl_setopt( $ch, CURLOPT_POSTFIELDS, json_encode( $data ) );
		}
	} else {
		curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, $method );
	}

	if ( ! empty( $headers ) ) {
		curl_setopt( $ch, CURLOPT_HTTPHEADER, $headers );
	}

	$response = curl_exec( $ch );

	// 获取状态码
	$statusCode = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
	http_response_code( $statusCode );

	// 如果是 401/403,则重新设置 session
	if ( $statusCode == 401 || $statusCode == 403 ) {
		generate_guest_id();
	}


	curl_close( $ch );

	return $response;
}

function generate_guest_id() {
	return $_SESSION['amber_guest_id'] = substr( md5( uniqid( rand(), true ) ), 0, 20 );
}
