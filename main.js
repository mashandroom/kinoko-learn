const categoriesJN = ['椎茸', 'エリンギ', 'えのき', 'マッシュルーム', 'しめじ'];
const MODEL_PATH = './model/model.json';
let cvs;
let ctx;
let cvs2;
let ctx2;
// 元となる解析対象ファイル名
let targetImage;
const IMAGE_WIDTH = 150;
const IMAGE_HEIGHT = 150;

window.onload = () => {
  //2Dコンテキストのオブジェクトを生成する
  cvs = document.getElementById('cvs1');
  ctx = cvs.getContext('2d');
  cvs2 = document.getElementById('cvs2');
  ctx2 = cvs2.getContext('2d');

  selfile.addEventListener(
    'change',
    evt => {
      // TODO キャンセル押下がとれない？
      // 一度ファイルを開いたあとにキャンセルするとこの処理が呼ばれるが
      // 一度も開いてない状態でキャンセルするとこの処理が呼ばれない
      if (evt.target.files.length > 0) {
        // 一度開いていたらtargetImageに保持しているのでそれを使う
        targetImage = evt.target.files;
      } else if (!targetImage) {
        // キャンセルでも一度開いていたらtargetImageにセットされているので
        // あればそれを使う。なければ処理しない
        return;
      }
      ctx.clearRect(0, 0, cvs.width, cvs.height);
      ctx2.clearRect(0, 0, cvs2.width, cvs2.height);
      drawImageOnCanvas(targetImage);
    },
    false
  );
  selfilemulti.addEventListener('change', evt => {
    if (evt.target.files.length == 0) {
      return;
    }
    clearFiles();
    listFiles(evt.target.files);
  });
  window.addEventListener(
    'dragover',
    evt => {
      evt.preventDefault(); // ブラウザのデフォルトの画像表示処理をOFF
    },
    false
  );
  window.addEventListener('drop', evt => {
    evt.preventDefault(); // ブラウザのデフォルトの画像表示処理をOFF

    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx2.clearRect(0, 0, cvs2.width, cvs2.height);
    targetImage = evt.dataTransfer.files;
    drawImageOnCanvas(targetImage);
  });
};

function drawImageOnCanvas(targetImage) {
  var image = new Image();
  var reader = new FileReader();

  // File APIを使用し、ローカルファイルを読み込む
  reader.onload = evt => {
    // 画像がloadされた後に、canvasに描画する
    image.onload = () => {
      // 入力画像が正方形じゃない時にどうするか？
      // 短辺に合わせて余白ができると、mush01.jpgがエリンギに判定された
      // はみ出す方向で正方形にしたら正しく認識されたが、どうだろうか。。
      const ratio = Math.max(cvs.width / image.width, cvs.height / image.height);
      const width = Math.floor(image.width * ratio);
      const height = Math.floor(image.height * ratio);
      ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, width, height);
      clearResult();
    };

    // 画像のURLをソースに設定
    image.src = evt.target.result;
  };

  // ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
  reader.readAsDataURL(targetImage[0]);
}

function createImageData(img) {
  const tmpCv = document.createElement('canvas');
  cvs.width = IMAGE_WIDTH;
  cvs.height = IMAGE_HEIGHT;
  const tmpCt = tmpCv.getContext('2d');
  tmpCt.drawImage(img, 0, 0, img.width, img.height, 0, 0, cvs.width, cvs.height);
  const imageData = tmpCt.getImageData(0, 0, cvs.width, cvs.height);
  return imageData;
}

/**
 * キノコ一括推論処理
 */
function predictAll() {
  tf.loadLayersModel(MODEL_PATH).then(model => {
    console.log('model loaded.');
    let id = 0;
    let img = document.getElementById(`kinoko-img-${id}`);
    const predictResults = [];
    while (img) {
      const imageData = createImageData(img);
      const tfObj = tf.browser.fromPixels(imageData);
      const tensorObj = tf.expandDims(tfObj, 0);
      const predict = model.predict(tensorObj);
      console.log(`rankType: ${predict.rankType}`);
      predictResults.push(predict.data())
      id++;
      img = document.getElementById(`kinoko-img-${id}`);
    }

    Promise.all(predictResults).then((results) => {
      results.forEach((data, id) => {
        console.log(`> kinoko-img-${id}`);
        const tr = document.getElementById(`kinoko-tr-${id}`);
        const td = document.createElement("td");
        const ul = document.createElement('ul');
        categoriesJN.forEach((value, i) => {
          const li = document.createElement('li');
          li.appendChild(document.createTextNode(`${value}: ${data[i] * 100}%`));
          ul.appendChild(li)
        });
        td.appendChild(ul);
        tr.appendChild(td);
      });
    });
  });
}

/**
 * キノコ推論処理
 */
function predict() {
  clearResult();

  const imgData = ctx.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  // 余白を黒で塗りつぶしてみた
  // const realHeight = 128;
  // for (let h = 0; h < IMAGE_HEIGHT - realHeight; h++) {
  //   let base = (h + realHeight) * IMAGE_WIDTH * 4;
  //   for (let w = 0; w < 150; w++) {
  //     imgData.data[base] = 0;
  //     imgData.data[base + 1] = 0;
  //     imgData.data[base + 2] = 0;
  //     imgData.data[base + 3] = 255; // alpha
  //     base += 4;
  //   }
  // }
  ctx2.putImageData(imgData, 0, 0);
  const tfObj = tf.browser.fromPixels(imgData);
  const tensorObj = tf.expandDims(tfObj, 0);
  tf.loadLayersModel(MODEL_PATH).then(model => {
    console.log('model loaded.');
    const predict = model.predict(tensorObj);
    console.log(`rankType: ${predict.rankType}`);
    predict.data().then(showResult);
  });
}

function fillBackground(context) {
  context.fillStyle = 'rgb(0, 0, 0)';
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
}

function showLog(data) {
  for (var i = 0; i < categoriesJN.length; i++) {
    console.log(`${categoriesJN[i]}: ${data[i] * 100}`);
  }
}

function showResult(data) {
  const result = document.getElementById('result');
  categoriesJN.forEach((value, i) => {
    const li = document.createElement('li');
    const text = document.createTextNode(`${value}: ${data[i] * 100}%`);
    li.appendChild(text);
    result.appendChild(li);
  });

  showLog(data);
}

function clearResult() {
  const result = document.getElementById('result');
  while (result.firstChild) {
    result.removeChild(result.firstChild);
  }
}

// function fitImageOn(canvas, imageObj) {
//   ctx.clearRect(0, 0, canvas.width, canvas.height);

//   var imageDimensionRatio = imageObj.width / imageObj.height;
//   var canvasDimensionRatio = canvas.width / canvas.height;
//   var renderableHeight, renderableWidth, xStart, yStart;
//   if (imageDimensionRatio < canvasDimensionRatio) {
//     renderableHeight = canvas.height;
//     renderableWidth = imageObj.width * (renderableHeight / imageObj.height);
//     xStart = (canvas.width - renderableWidth) / 2;
//     yStart = 0;
//   } else if (imageDimensionRatio > canvasDimensionRatio) {
//     renderableWidth = canvas.width;
//     renderableHeight = imageObj.height * (renderableWidth / imageObj.width);
//     xStart = 0;
//     yStart = (canvas.height - renderableHeight) / 2;
//   } else {
//     renderableHeight = canvas.height;
//     renderableWidth = canvas.width;
//     xStart = 0;
//     yStart = 0;
//   }
//   ctx.drawImage(imageObj, xStart, yStart, renderableWidth, renderableHeight);
// }

function clearFiles() {
  while (resultTable.firstChild) {
    resultTable.removeChild(resultTable.firstChild);
  }
}

function listFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    const img = document.createElement('img');

    const reader = new FileReader();

    // File APIを使用し、ローカルファイルを読み込む
    reader.onload = evt => {
      img.src = evt.target.result;
      img.width = 150;
      img.height = 150;
      img.id = `kinoko-img-${i}`;
      td.appendChild(img);
      tr.appendChild(td);
      tr.id = `kinoko-tr-${i}`;
      resultTable.appendChild(tr);
    };

    // ファイルを読み込み、データをBase64でエンコードされたデータURLにして返す
    reader.readAsDataURL(files[i]);
  }
}
