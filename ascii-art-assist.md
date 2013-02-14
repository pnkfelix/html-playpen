<!DOCTYPE HTML> <!-- -*- mode: md; indent-tabs-mode:nil; tab-width: 4 -*- -->
<html>
	<head>
		<meta charset="UTF-8">
		<title>ASCII Art Assistance</title>
		<script src="jx.js"></script>
	</head>
<body>

ASCII Art Assistance
====================

Map first 223 character codes to pixel counts in their rendered forms
---------------------------------------------------------------------

<canvas id="testcanvas" width="100" height="100"></canvas>
<div id="output"></div>
<script>
var codeDump =
    (function locals() { var i = 32;
                         return function codeDump(start, width, height) {
                             var c = document.getElementById('testcanvas');
                             var ctx = c.getContext('2d');
                             ctx.strokeStyle = 'blue';
                             ctx.lineWidth = 6;
                             ctx.font = '9pt Menlo';
                             ctx.fillText("Hello", 50, 50);
                             var a = ["table"];
                             for (var y = 0; y < 32; y++) {
                                 var row = ["tr"];
                                 for (var x = 0; x < 16; x++) {
                                     var s = String.fromCharCode(i);
                                     row.push(["td", String(i)]);
                                     row.push(["td", "'"+s+"'"]);
                                     i++;
                                 }
                                 a.push(row);
                             }
                             return a;
                         };})();

for (var i=0; i<32; i++) {
    divWriteJx("output", codeDump(16, 32));
}
</script>
</body>
</html>
