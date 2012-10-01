test([
  'var a = Buffer(10)',
  'a.fill(2, 0, 5)',
  'var b = a.slice(3, 7)',
  'b.fill(1, 1, 3)',
  'var c = Buffer([3,4,5])',
  'c.copy(a, 7)'
], [
  'a.length == 10',
  'a.readInt8(0) == 2',
  'a.readInt8(1) == 2',
  'a.readInt8(2) == 2',
  'a.readInt8(3) == 2',
  'a.readInt8(4) == 1',
  'a.readInt8(5) == 1',
  'b.length == 4',
  'b.readInt8(0) == 2',
  'b.readInt8(1) == 1',
  'b.readInt8(2) == 1',
  'b.readInt8(3) == 0',
  'c.length == 3',
  'c.readUInt8(0) == 3',
  'c.readUInt8(1) == 4',
  'c.readUInt8(2) == 5',
  'a.readUInt8(7) == 3',
  'a.readUInt8(8) == 4',
  'a.readUInt8(9) == 5'
]);
