if(typeof alert == 'undefined'){
  alert = console.log;
}

var errors = [],
defer;

function test(code, asts){
  clearTimeout(defer);
  var run,
  cnt = 0,
  ast = function(res){
    if(!res){
      errors.push('Assertion failed: ' + asts[cnt]);
    }
    cnt++;
  };
  if(code instanceof Array){
    code = code.join('\n');
  }
  try{
    run = new Function('ast', code + ';ast(' + asts.join(');ast(') + ');');
  }catch(e){
    errors.push('Parsing failed: ' + e + '\n' + code);
  }
  if(run){
    try{
      run(ast);
    }catch(e){
      errors.push('Evaluation failed: ' + e + '\n' + code);
    }
  }
  defer = setTimeout(function(){
    alert(errors.length ? ('Something went wrong...\n\n' + errors.join('\n\n')) :
          'Used backend: ' + (Buffer.hasDataView ? 'DataView' : 'Object') + '\nAll tests passed...');
  }, 0);
}