test([
  'var a = Buffer("Saluton! Mondo", "utf8")',
  'var b = Buffer("Привет, мир!", "utf8")',
  'var c = Buffer("こんにちは世界", "utf8")'
], [
  'a.length == 14',
  'a.toString("utf8") == "Saluton! Mondo"',
  'b.length == 40',
  'b.toString("utf8") == "Привет, мир!"',
  'c.length == 47',
  'c.toString("utf8") == "こんにちは世界"'
]);

test([
  'var a = Buffer("AAEC", "base64");',
  'var b = Buffer("AAECAwQ=", "base64")',
  'var c = Buffer("AAECAwQFBgcICQ==", "base64")'
], [
  'a.length == 3',
  'a.toString("base64") == "AAEC"',
  'b.length == 5',
  'b.toString("base64") == "AAECAwQ="',
  'c.length == 10',
  'c.toString("base64") == "AAECAwQFBgcICQ=="'
]);
