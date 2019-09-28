const express = require('express')
const app = express()
const path = require('path')
const fs = require('fs')
const axios = require('axios')
const cheerio = require('cheerio')

const NewsAPI = require('newsapi')
const newsapi = new NewsAPI('4fb96f510f3142c0bba0236ccec9f782')

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(err => {
  console.error(err)
  if (!res.headersSent) {
    res.status(500).json({message: 'Internal Server Error'})
  }
})
process.on('uncaughtException', (err) => console.error(err))
process.on('unhandledRejection', (err) => console.error(err))
process.on('SIGINT', () => process.exit(1))

app.use(express.static('dist'))
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

async function downloadImage(url) {
  const token = url.split('.')
  const ext = token[token.length - 1]
  const writer = fs.createWriteStream(path.resolve(__dirname, 'dist', `temp.${ext}`))

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

// SSR
app.get('/', wrap(async (req, res) => {

  // ニュースAPIでニュース取得
  const response = await newsapi.v2.topHeadlines({
    q: req.query.q,
    category: req.query.category,
    language: 'ja',
    country: 'jp',
  })

  let result = {}
  for (const article of response.articles) {
    if (article.urlToImage) {
      result = article
      break
    }
  }

  if (result.urlToImage) {
    await downloadImage(result.urlToImage)
  }

  // HTMLレンダリング
  const template = fs.readFileSync('./dist/template.html', 'utf-8')

  const $ = cheerio.load(template)

  // OGPメタタグを作成
  const title = `<meta property="og:title" content="${result.title}" />`
  const pageType = '<meta property="og:type" content="article" />'
  const pageURL = '<meta property="og:url" content="https://cartoonnews.herokuapp.com" />'
  const thumbnailUrl = `<meta property="og:image" content="${result.urlToImage}" />`
  const siteName = '<meta property="og:site_name" content="日刊漫画化ニュース" />'
  const description = '<meta property="og:description" content="ページのディスクリプション" />'
  const twitterCard = '<meta name="twitter:card" content="summary" />'


  // headerにdataを埋め込む
  $('head').append(title)
  $('head').append(pageType)
  $('head').append(pageURL)
  $('head').append(thumbnailUrl)
  $('head').append(siteName)
  $('head').append(description)

  // twitter
  $('head').append(twitterCard)

  // JSON
  $('head').append(`<script id='data' data-json='${JSON.stringify(result)}'></script>`)

  res.writeHead(200, {'Content-Type': 'text/html'})
  res.write($.html())
  res.end()
}))


if (process.env.NODE_ENV === 'dev') {
  const Bundler = require('parcel-bundler')
  const bundler = new Bundler('client/template.html', {})
  app.use(bundler.middleware())
}

app.listen(process.env.PORT || 3000, () => {
  console.log('Access to http://localhost:3000')
})

