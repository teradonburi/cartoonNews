const NewsAPI = require('newsapi');
const iconv = require('iconv-lite')
const newsapi = new NewsAPI('4fb96f510f3142c0bba0236ccec9f782');
// To query /v2/top-headlines
// All options passed to topHeadlines are optional, but you need to include at least one of them
newsapi.v2.topHeadlines({
  // sources: 'bbc-news,the-verge',
  // q: 'bitcoin',
  // category: 'business',
  language: 'ja',
  country: 'jp'
}).then(response => {
  for (const article of response.articles) {
    console.log(article.source.name)
    console.log(article.author)
    console.log(article.title)
    // const description = iconv.decode(article.description, 'win1251');
    console.log(iconv.decode(Buffer.from(article.description.toString('UTF-8'), 'binary'), "Shift_JIS")); 
    console.log(article.description.toString('UTF-8'))
    console.log(article.url)
    console.log(article.urlToImage)
    console.log(article.publishedAt)
    console.log(article.content)
    console.log('------------')
  }
  /*
    {
      status: "ok",
      articles: [...]
    }
  */
});
// // To query /v2/everything
// // You must include at least one q, source, or domain
// newsapi.v2.everything({
//   q: 'bitcoin',
//   sources: 'bbc-news,the-verge',
//   domains: 'bbc.co.uk, techcrunch.com',
//   from: '2017-12-01',
//   to: '2017-12-12',
//   language: 'jp',
//   sortBy: 'relevancy',
//   page: 2
// }).then(response => {
//   console.log(response);
//   /*
//     {
//       status: "ok",
//       articles: [...]
//     }
//   */
// });
// // To query sources
// // All options are optional
// newsapi.v2.sources({
//   category: 'technology',
//   language: 'en',
//   country: 'jp'
// }).then(response => {
//   console.log(response);
//   /*
//     {
//       status: "ok",
//       sources: [...]
//     }
//   */
// });