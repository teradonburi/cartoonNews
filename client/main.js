import 'regenerator-runtime/runtime'
import moment from 'moment'
import { loadImage } from './image'


async function main() {
  const dataScript = document.querySelector('#data')
  const news = JSON.parse(decodeURIComponent(dataScript.getAttribute('data-json')))
  dataScript.parentNode.removeChild(dataScript)

  let comment = null

  if (news.title) {
    const title = document.querySelector('#title')
    title.innerText = news.title
    const comments = news.title.match(/「.*」/)
    if (comments && comments.length > 0) {
      comment = comments[0].replace(/「|」/g, '')
    }
  }
  if (news.description) {
    const description = document.querySelector('#description')
    description.innerText = news.description
    const comments = news.description.match(/「.*」/)
    if (comments && comments.length > 0) {
      comment = comments[0].replace(/「|」/g, '')
    }
  }
  if (news.publishedAt) {
    const publishedAt = document.querySelector('#publishedAt')
    publishedAt.innerText = `掲載日：${moment(news.publishedAt).format('YYYY月MM月DD日 HH時mm分').toString()}`
  }
  if (news.source.name) {
    const source = document.querySelector('#source')
    source.innerText = `掲載元：${news.source.name}`
  }
  if (news.url) {
    const url = document.querySelector('#url')
    const a = document.createElement('a')
    a.href = news.url
    a.target = '_blank'
    a.innerHTML = news.url
    a.style.wordBreak = 'break-all'
    url.innerHTML = '掲載元：' + a.outerHTML
  }

  // 画像ファイルの読み込み
  let imgMask = await loadImage(require('./mask.jpg'))
  let img = await loadImage(news.image)

  const canvas = document.querySelector('canvas')
  if (comment) {
    const commentDOM = document.createElement('div')
    commentDOM.classList.add('arrow_box')
    if (comment.length > 28) {
      comment = comment.slice(0, 27) + '...'
    }
    commentDOM.innerHTML = comment
    canvas.insertAdjacentHTML('afterend', commentDOM.outerHTML)
  }

  // 描画するための2Dコンテキスト
  const ctx = canvas.getContext('2d')
  canvas.width = img.width
  canvas.height = img.height

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

  canvas.style.width = window.parent.screen.width < 600 ? '90%' : '300px'
  canvas.style.border = '1px solid black'
  canvas.style.boxShadow = '2px 4px 4px grey'

  // Canvasに画像を描画する
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
  ctx.putImageData(imageData3, 0, 0)

}
main()

