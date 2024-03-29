## What does Rotten Tomatoes Scraper do? 🍅🍿

This scraper can be used to scrape and extract information from the [Rotten Tomatoes](https://www.rottentomatoes.com/) website about movies and TV shows. This information can be used for variety of purposes, for example:

- create a **database** of movies and TV shows, **track changes** in the information over time or **monitor** what is currently available on different streaming services;
- spot **current trends**: extract what's currently playing in theaters, what's most popular on streaming services and what genres, actors and creators are on the rise;
- **analysis**: what genres tend to be more highly rated than others, how ratings change over time, how did the movies and TV shows perform in both popularity and the box office;
- **marketing**: identify themes and patterns in currently popular and successful movies or TV shows and what they explore, gain insights into what is working for scpecific audiences; 
- others such as building **recommendation engines**, creating **visualizations**, **machine learning** and **predictive modeling** and more...

## How to scrape Rotten Tomatoes 🎥
To scrape [Rotten Tomatoes](https://www.rottentomatoes.com/) just follow these few simple steps and you'll get your data:

1. Click on Try for free.
2. Enter one or more URLs you want to scrape.
3. Click on Run.
4. When Rotten Tomatoes Scraper has finished, preview or download your data from the Dataset tab.

### Examples of URLs you can insert as an input

- insert URLs of specific movies or TV shows, scraper will scrape their available details, for example:
    - https://www.rottentomatoes.com/tv/the_office
    - https://www.rottentomatoes.com/m/everything_everywhere_all_at_once
- visit [Browse](https://www.rottentomatoes.com/browse) to get URLs with various filters, scraper will keep loading more items and scraping them until it reaches the limit, for example:
    - action movies on Netflix: https://www.rottentomatoes.com/browse/movies_at_home/affiliates:netflix~genres:action
    - horror movies in theaters: https://www.rottentomatoes.com/browse/movies_in_theaters/genres:horror
- any other URL on [Rotten Tomatoes](https://www.rottentomatoes.com/), scraper will find all movies and TV shows on the webpage and scrape its details, for example:
    - all movies and TV shows from the home page: https://www.rottentomatoes.com
    - all movies and TV shows with Pedro Pascal (😉): https://www.rottentomatoes.com/celebrity/pedro_pascal

## Example of an output 🎬

```json
{
    "title": "Everything Everywhere All at Once",
    "synopsis": "Directed by Daniel Kwan and Daniel Scheinert, collectively known as Daniels, the film is a hilarious big-hearted sci-fi action adventure about an exhausted Chinese American woman (Michelle Yeoh) who can't seem to finish her taxes.",
    "cast": "Michelle Yeoh, Stephanie Hsu, Ke Huy Quan",
    "rating": "R (Sexual Material|Language|Some Violence)",
    "genre": "Comedy, Adventure, Sci-fi, Fantasy",
    "original language": "English",
    "director": "Dan Kwan, Daniel Scheinert",
    "producer": "Joe Russo, Anthony Russo, Mike Larocca, Dan Kwan, Daniel Scheinert, Jonathan Wang",
    "writer": "Dan Kwan, Daniel Scheinert",
    "release date (theaters)": "Apr 8 2022, wide",
    "release date (streaming)": "Jun 7 2022",
    "box office (gross usa)": "$69.5M",
    "runtime": "2h 12m",
    "distributor": "A24",
    "sound mix": "Dolby Digital",
    "aspect ratio": "Flat (1.85:1)",
    "tomatometer": "95",
    "audience score": "88",
    "url": "https://www.rottentomatoes.com/m/everything_everywhere_all_at_once"
}
```

## How much will it cost to scrape Rotten Tomatoes? 🎞️
Apify gives you with $5 free usage credits every month on the [Apify Free plan](https://apify.com/pricing). You can get on average 1700 results per month from Rotten Tomatoes Scraper for that, so this will be completely for free!

But if you need to get more data regularly from Rotten Tomatoes, you should grab an Apify subscription. We recommend our [$49/month Personal plan](https://apify.com/pricing) or our [ $499/month Team plan](https://apify.com/pricing)!

## Is it legal to scrape Rotten Tomatoes? 📽️
Read: [is web scraping legal?](https://blog.apify.com/is-web-scraping-legal/)