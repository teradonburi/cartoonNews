import 'regenerator-runtime/runtime'
import axios from 'axios'

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve(img)
    }
    img.src = src
  })
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height
  document.body.appendChild(canvas)
  return {ctx, canvas}
}


async function main() {
  // 描画するための2Dコンテキスト
  const news = await axios.get('/api/news?category=sport')
  console.log(news)

  // 画像ファイルの読み込み
  let imgMask = await loadImage(require('./mask.jpg'))
  let img = await loadImage('./temp.jpg')

  const {ctx, canvas} = createCanvas(img.width, img.height)

  ctx.drawImage(imgMask, 0, 0, imgMask.width, imgMask.height, 0, 0, canvas.clientWidth, canvas.clientHeight)
  const maskImageData = ctx.getImageData(0, 0, canvas.clientWidth, canvas.clientHeight)
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
  ctx.drawImage(img, 0, 0)

  // 画像情報の取得（offsetX, offsetY, 幅、高さ）
  const originalImageData = ctx.getImageData(0, 0, canvas.clientWidth, canvas.clientHeight)
  let imageData1 = ctx.createImageData(canvas.clientWidth, canvas.clientHeight)
  let imageData2 = ctx.createImageData(canvas.clientWidth, canvas.clientHeight)
  let imageData3 = ctx.createImageData(canvas.clientWidth, canvas.clientHeight)

  // コピー
  let data = originalImageData.data
  for (let i = 0; i < data.length; i++) {
    imageData1.data[i] = data[i]
    imageData2.data[i] = data[i]
    imageData3.data[i] = data[i]
  }

  // imageData.dataが1pxごとのRGBAが含まれる
  let data1 = imageData1.data
  let data2 = imageData2.data

  /////////////// 線画 ////////////

  // エンボス
  const _data = data.slice()
  const embossColor = (color, i) => {
    const prevLine = i - (canvas.clientWidth * 4)
    return ((_data[prevLine-4+color] * -1) + _data[i+color]) + (255 / 2)
  }

  // 2行目〜n-1行目
  for (let i = canvas.clientWidth * 4; i < data1.length - (canvas.clientWidth * 4); i += 4) {
    // 2列目〜n-1列目
    if (i % (canvas.clientWidth * 4) === 0 || i % ((canvas.clientWidth * 4) + 300) === 0) {
      // nop
    } else {
      data1[i]   = embossColor(0, i)
      data1[i+1] = embossColor(1, i)
      data1[i+2] = embossColor(2, i)
    }
  }

  // グレースケール
  for (let i = 0; i < data1.length; i += 4) {
    // (r+g+b)/3
    const color = (data1[i] + data1[i+1] + data1[i+2]) / 3
    data1[i] = data1[i+1] = data1[i+2] = color
  }

  const threshold = 255 / 2.1

  const getColor = (data, i) => {
    // rgbの平均
    const avg = (data[i] + data[i+1] + data[i+2]) / 3
    if (threshold < avg) {
      return 255
    }
    return avg

  }

  for (let i = 0; i < data1.length; i += 4) {
    const color = getColor(data1, i)
    data1[i] = data1[i+1] = data1[i+2] = color
  }
  /////////////////////////////////////////

  const threshold2 = 255 / 10

  const getColor2 = (data, i) => {
    // rgbの平均
    const avg = (data[i] + data[i+1] + data[i+2]) / 3
    if (threshold2 * 4 < avg) {
      return 255
    } else if (threshold2 * 3 < avg) {
      return 128
    }
    return 0

  }

  for (let i = 0; i < data2.length; i += 4) {
    const color = getColor2(data2, i)
    data2[i] = data2[i+1] = data2[i+2] = color
  }

  //////////////////////////////////////////////

  for (let i = 0; i < data.length; i+= 4) {
    if (data2[i] === 128 && data2[i + 1] === 128 && data2[i+2] === 128) {
      imageData3.data[i] = data2[i] * maskImageData.data[i]/255
      imageData3.data[i+1] = data2[i+1] * maskImageData.data[i+1]/255
      imageData3.data[i+2] = data2[i+2] * maskImageData.data[i+2]/255
    } else {
      imageData3.data[i] = data2[i] * data1[i] / 255
      imageData3.data[i+1] = data2[i+1] * data1[i+1] / 255
      imageData3.data[i+2] = data2[i+2] * data1[i+2] / 255
    }
  }

  // Canvasに画像を描画する
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
  ctx.putImageData(imageData3, 0, 0)
}
main()

