<?php
// PHP code to obtain country, city, 
// continent, etc using IP Address
  
function getVisIpAddr() {
      
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    }
    else if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    }
    else {
        return $_SERVER['REMOTE_ADDR'];
    }
}
  
// Store the IP address
$ip = getVisIPAddr();

//$ip = '52.25.109.230';
  
// Use JSON encoded string and converts
// it into a PHP variable
$ipdat = @json_decode(file_get_contents( "http://www.geoplugin.net/json.gp?ip=" . $ip));
echo "<pre>";
print_r($ipdat);

echo 'Country Name: ' . $ipdat->geoplugin_countryName . "\n";
if($ipdat->geoplugin_countryName != 'India'){
	echo "404 Page Not Found";
	die();
}
   
?>