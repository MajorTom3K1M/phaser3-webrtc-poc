let test = function (e) {
  return (e);
};

test = test2;

function test2(e) {
  console.log(e);
}

test("hello");
