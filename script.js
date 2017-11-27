var Particle = function(scale, color, speed) {
    this.scale = scale; //大きさ
    this.color = color; //色
    this.speed = speed; //速度
    this.position = {   //位置
        x: 100,
        y: 100
    };
};
 
var canvas = document.querySelector('#canvas-container');
var ctx = canvas.getContext('2d');
var patricle = new Particle(6, '#D0A000', 2);
 
loop();
function loop() {
    requestAnimFrame(loop);
    // 描画をクリアー
    ctx.clearRect(0,0, canvas.width, canvas.height);
 
    patricle.position.x += patricle.speed;
    patricle.draw();
 
    // 画面外に出たら左へ戻る
    if (patricle.position.x > canvas.width) patricle.position.x = -30;
}

Particle.prototype.draw = function() {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.scale, 0, 2*Math.PI, false);
    ctx.fillStyle = this.color;
    ctx.fill();
};

onload = function(){
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 1300;
  c.height = 1000;

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');

  // 頂点シェーダとフラグメントシェーダの生成
  var v_shader = create_shader('vs');
  var f_shader = create_shader('fs');

  // プログラムオブジェクトの生成とリンク
  var prg = create_program(v_shader, f_shader);

  // attributeLocationを配列に取得
  var attLocation = new Array(2);
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'color');

  // attributeの要素数を配列に格納
  var attStride = new Array(2);
  attStride[0] = 3;
  attStride[1] = 4;

  // 頂点属性を格納する配列
  var position = [
     0.0, 1.0, 0.0,
     0.0, 0.0, 1.0,
    -1.0, 0.0, 1.0
  ];
  var color = [
    1.0, 0.0, 0.0, 1.0,
    0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0
  ];

  // VBOの生成
  var pos_vbo = create_vbo(position);
  var col_vbo = create_vbo(color);

  // VBO を登録する
  set_attribute([pos_vbo, col_vbo], attLocation, attStride);

  // uniformLocationの取得
 var uniLocation = gl.getUniformLocation(prg, 'mvpMatrix');

  // minMatrix.js を用いた行列関連処理
  // matIVオブジェクトを生成
  var m = new matIV();

  // 各種行列の生成と初期化
  var wMatrix = m.identity(m.create());
  var vMatrix = m.identity(m.create());
  var pMatrix = m.identity(m.create());
  var vpMatrix = m.identity(m.create());
  var wvpMatrix = m.identity(m.create());

  // ビュー×プロジェクション座標変換行列
  m.lookAt([2.0, 0.0, 8.0], [0, 0, 0], [0, 1, 0], vMatrix);// カメラ位置、注視点、上方向
  m.perspective(45, c.width / c.height, 0.3, 300, pMatrix);// 画角 アスペクト比,近クリップ面,遠方クリップ面
  m.multiply(pMatrix, vMatrix, vpMatrix);

  // カウンタの宣言
  var count = 0;
	
  // 恒常ループ
  (function(){
    // canvasを初期化
    gl.clearColor(0.0, 0.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // カウンタを元にラジアンを算出
    var rad = (count % 360) * Math.PI / 180;

    // モデルはY軸を中心に回転する
    m.identity(wMatrix);
    m.translate(wMatrix, [1.0, -1.0, 0.0], wMatrix);
    m.rotate(wMatrix, rad, [0, 1, 0], wMatrix);

    // モデルの座標変換行列を完成させレンダリングする
    m.multiply(vpMatrix, wMatrix, wvpMatrix);
    gl.uniformMatrix4fv(uniLocation, false, wvpMatrix);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // コンテキストの再描画
    gl.flush();

    // カウンタをインクリメントする
    count++;

    // ループのために再帰呼び出し
    setTimeout(arguments.callee, 1000 / 30);
  })();

  // シェーダを生成する関数
  function create_shader(id){
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if(!scriptElement){return;}

    // scriptタグのtype属性をチェック
    switch(scriptElement.type){
    case 'x-shader/x-vertex':    // 頂点シェーダ
      shader = gl.createShader(gl.VERTEX_SHADER);
      break;
    case 'x-shader/x-fragment': // ピクセルシェーダ
      shader = gl.createShader(gl.FRAGMENT_SHADER);
      break;
    default :// それ以外
      return;
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
      return shader;    // 成功していたらシェーダを返して終了
    }else{
      // 失敗していたらエラーログをアラートする
      alert(gl.getShaderInfoLog(shader));
    }
  }

  // プログラムオブジェクトを生成しシェーダをリンクする関数
  function create_program(vs, fs){
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    // シェーダをリンク
    gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){
      // 成功していたらプログラムオブジェクトを有効にする
      gl.useProgram(program);
      return program;      // プログラムオブジェクトを返して終了
    }else{
      // 失敗していたらエラーログをアラートする
      alert(gl.getProgramInfoLog(program));
    }
  }

  // VBOを生成する関数
  function create_vbo(data){
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();
    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    // バッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // 生成した VBO を返して終了
    return vbo;
  }

  // VBOをバインドし登録する関数
  function set_attribute(vbo, attL, attS){
    // 引数として受け取った配列を処理する
    for(var i in vbo){
      // バッファをバインドする
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
      // attributeLocationを有効にする
      gl.enableVertexAttribArray(attL[i]);
      // attributeLocationを通知し登録する
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
  }
};
