// ---------------------------
// Creating Indexes
// ---------------------------

// Book indexes
CREATE INDEX INDEX_Book_book_id FOR (b:Book) ON (b.book_id);
CREATE INDEX INDEX_Book_work_id FOR (b:Book) ON (b.work_id);

// Author index
CREATE INDEX INDEX_Author_author_id FOR (a:Author) ON (a.author_id);

// Work index
CREATE INDEX INDEX_Work_work_id FOR (w:Work) ON (w.work_id);

// Series index
CREATE INDEX INDEX_Series_series_id FOR (s:Series) ON (s.series_id);

// Genre index
CREATE INDEX INDEX_Genre_name FOR (g:Genre) ON (g.name);

// User index
CREATE INDEX INDEX_User_user_id FOR (u:User) ON (u.user_id);

// Review index
CREATE INDEX INDEX_Review_review_id FOR (r:Review) ON (r.review_id);

// ---------------------------
// Loading .json files
// ---------------------------

// 1. Author
CALL apoc.load.json('file:///goodreads_book_authors.json') YIELD value AS line
CALL {
  WITH line
  MERGE (a:Author {author_id: line.author_id})
  SET a.name               = line.name,
      a.average_rating     = CASE line.average_rating WHEN "" THEN null ELSE toFloat(line.average_rating) END,
      a.ratings_count      = CASE line.ratings_count WHEN "" THEN null ELSE toInteger(line.ratings_count) END,
      a.text_reviews_count = CASE line.text_reviews_count WHEN "" THEN null ELSE toInteger(line.text_reviews_count) END
} IN TRANSACTIONS OF 20000 ROWS;

// 2. Work
CALL apoc.load.json('file:///goodreads_book_works.json') YIELD value AS line
CALL {
  WITH line
  MERGE (w:Work {work_id: line.work_id})
  SET w.original_title                 = line.original_title,
      w.books_count                    = CASE line.books_count WHEN "" THEN null ELSE toInteger(line.books_count) END,
      w.reviews_count                  = CASE line.reviews_count WHEN "" THEN null ELSE toInteger(line.reviews_count) END,
      w.text_reviews_count             = CASE line.text_reviews_count WHEN "" THEN null ELSE toInteger(line.text_reviews_count) END,
      w.ratings_count                  = CASE line.ratings_count WHEN "" THEN null ELSE toInteger(line.ratings_count) END,
      w.ratings_sum                    = CASE line.ratings_sum WHEN "" THEN null ELSE toInteger(line.ratings_sum) END,
      w.original_publication_year      = CASE line.original_publication_year WHEN "" THEN null ELSE toInteger(line.original_publication_year) END,
      w.original_publication_month     = CASE line.original_publication_month WHEN "" THEN null ELSE toInteger(line.original_publication_month) END,
      w.original_publication_day       = CASE line.original_publication_day WHEN "" THEN null ELSE toInteger(line.original_publication_day) END,
      w.rating_dist                    = line.rating_dist,
      w.media_type                     = line.media_type,
      w.best_book_id                   = line.best_book_id,
      w.default_description_language_code = line.default_description_language_code,
      w.default_chaptering_book_id     = line.default_chaptering_book_id,
      w.original_language_id           = line.original_language_id
} IN TRANSACTIONS OF 20000 ROWS;

// 3. Series
CALL apoc.load.json('file:///goodreads_book_series.json') YIELD value AS line
CALL {
  WITH line
  MERGE (s:Series {series_id: line.series_id})
  SET s.title              = line.title,
      s.description        = line.description,
      s.note               = line.note,
      s.numbered           = CASE line.numbered
                               WHEN "true"  THEN true
                               WHEN "false" THEN false
                               ELSE null
                             END,
      s.series_works_count = CASE line.series_works_count WHEN "" THEN null ELSE toInteger(line.series_works_count) END,
      s.primary_work_count = CASE line.primary_work_count WHEN "" THEN null ELSE toInteger(line.primary_work_count) END
} IN TRANSACTIONS OF 20000 ROWS;

// 4. Genre
CALL apoc.load.json('file:///goodreads_book_genres_initial.json') YIELD value AS line
UNWIND keys(line.genres) AS genreName
CALL {
  WITH genreName
  MERGE (g:Genre {name: genreName})
} IN TRANSACTIONS OF 20000 ROWS;

// 5. Book
CALL apoc.load.json('file:///goodreads_books_comics_graphic.json') YIELD value AS line
CALL {
  WITH line
  MERGE (b:Book {book_id: line.book_id})
  SET b.title                = line.title,
      b.title_without_series = line.title_without_series,
      b.description          = line.description,
      b.average_rating       = CASE line.average_rating WHEN "" THEN null ELSE toFloat(line.average_rating) END,
      b.ratings_count        = CASE line.ratings_count WHEN "" THEN null ELSE toInteger(line.ratings_count) END,
      b.text_reviews_count   = CASE line.text_reviews_count WHEN "" THEN null ELSE toInteger(line.text_reviews_count) END,
      b.image_url            = line.image_url,
      b.link                 = line.link,
      b.url                  = line.url,
      b.country_code         = line.country_code,
      b.language_code        = line.language_code,
      b.isbn                 = line.isbn,
      b.isbn13               = line.isbn13,
      b.asin                 = line.asin,
      b.kindle_asin          = line.kindle_asin,
      b.is_ebook             = line.is_ebook,
      b.num_pages            = CASE line.num_pages WHEN "" THEN null ELSE toInteger(line.num_pages) END,
      b.publication_year     = CASE line.publication_year WHEN "" THEN null ELSE toInteger(line.publication_year) END,
      b.publication_month    = CASE line.publication_month WHEN "" THEN null ELSE toInteger(line.publication_month) END,
      b.publication_day      = CASE line.publication_day WHEN "" THEN null ELSE toInteger(line.publication_day) END,
      b.edition_information  = line.edition_information,
      b.publisher            = line.publisher,
      b.format               = line.format,
      b.work_id              = line.work_id,
      // foreign-keys for MATCH
      b.author_ids           = [a IN line.authors | a.author_id],
      b.series_ids           = line.series,
      b.similar_book_ids     = line.similar_books
} IN TRANSACTIONS OF 2000 ROWS;

// 6. User
CALL apoc.load.json('file:///goodreads_interactions_comics_graphic.json') YIELD value AS line
CALL {
  WITH line
  MERGE (u:User {user_id: line.user_id})
} IN TRANSACTIONS OF 20000 ROWS;

// 7. Interaction
CALL apoc.load.json('file:///goodreads_interactions_comics_graphic.json')
YIELD value AS line
CALL {
  WITH line
  CREATE (i:Interaction {
    user_id:     line.user_id,
    book_id:     line.book_id,
    date_added:  line.date_added,
    review_id:   line.review_id,
    is_read:     line.is_read,
    rating:      toInteger(line.rating),
    review_text_incomplete: line.review_text_incomplete,
    date_updated: line.date_updated,
    read_at:     line.read_at,
    started_at:  line.started_at
  })
} IN TRANSACTIONS OF 5000 ROWS;

// 8. Review
CALL apoc.load.json('file:///goodreads_reviews_comics_graphic.json') YIELD value AS line
CALL {
  WITH line
  MERGE (r:Review {review_id: line.review_id})
  SET r.user_id    = line.user_id,
      r.book_id    = line.book_id,
      r.rating     = toInteger(line.rating),
      r.review_text = line.review_text,
      r.date_added  = line.date_added,
      r.date_updated = line.date_updated,
      r.read_at      = line.read_at,
      r.started_at   = line.started_at,
      r.n_votes      = toInteger(line.n_votes),
      r.n_comments   = toInteger(line.n_comments)
} IN TRANSACTIONS OF 20000 ROWS;

// ---------------------------
// Creating Relationships
// ---------------------------

// 1. (:Book)-[:AUTHORED_BY]->(:Author)
CALL apoc.periodic.iterate(
  "MATCH (b:Book) WHERE b.author_ids IS NOT NULL RETURN b",
  "UNWIND b.author_ids AS aid
   MATCH (a:Author {author_id: aid})
   MERGE (b)-[:AUTHORED_BY]->(a)",
  {batchSize:10000, parallel:false}
);

// 2. (:Book)-[:EDITION_OF]->(:Work)
CALL apoc.periodic.iterate(
  "MATCH (b:Book) WHERE b.work_id IS NOT NULL RETURN b",
  "MATCH (w:Work {work_id: b.work_id})
   MERGE (b)-[:EDITION_OF]->(w)",
  {batchSize:10000, parallel:false}
);

// 3. (:Book)-[:PART_OF_SERIES]->(:Series)
CALL apoc.periodic.iterate(
  "MATCH (b:Book) WHERE b.series_ids IS NOT NULL AND size(b.series_ids) > 0 RETURN b",
  "UNWIND b.series_ids AS sid
   MATCH (s:Series {series_id: sid})
   MERGE (b)-[:PART_OF_SERIES]->(s)",
  {batchSize:10000, parallel:false}
);

// 4. (:Book)-[:HAS_GENRE]->(:Genre)
CALL apoc.periodic.iterate(
  "MATCH (b:Book) WHERE b.genre_names IS NOT NULL AND size(b.genre_names) > 0 RETURN b",
  "UNWIND b.genre_names AS gname
   MATCH (g:Genre {name: gname})
   MERGE (b)-[:HAS_GENRE]->(g)",
  {batchSize:10000, parallel:false}
);

// 5. (:Book)-[:SIMILAR_TO]->(:Book)
CALL apoc.periodic.iterate(
  "MATCH (b:Book) WHERE b.similar_book_ids IS NOT NULL AND size(b.similar_book_ids) > 0 RETURN b",
  "UNWIND b.similar_book_ids AS sbid
   MATCH (sb:Book {book_id: sbid})
   MERGE (b)-[:SIMILAR_TO]->(sb)",
  {batchSize:10000, parallel:false}
);

// 6. (:User)-[:READ]->(:Book)
CALL apoc.periodic.iterate(
  "MATCH (i:Interaction) WHERE i.is_read = true RETURN i",
  "MATCH (u:User {user_id: i.user_id})
   MATCH (b:Book {book_id: i.book_id})
   MERGE (u)-[:READ]->(b)",
  {batchSize:10000, parallel:false}
);

// 7. (:User)-[:RATED]->(:Book)
CALL apoc.periodic.iterate(
  "MATCH (i:Interaction) WHERE i.rating IS NOT NULL AND i.rating > 0 RETURN i",
  "MATCH (u:User {user_id: i.user_id})
   MATCH (b:Book {book_id: i.book_id})
   MERGE (u)-[r:RATED]->(b)
   SET r.rating = i.rating",
  {batchSize:10000, parallel:false}
);

// 8. (:User)-[:WROTE_REVIEW]->(:Review)
CALL apoc.periodic.iterate(
  "MATCH (r:Review) RETURN r",
  "MATCH (u:User {user_id: r.user_id})
   MERGE (u)-[:WROTE_REVIEW]->(r)",
  {batchSize:10000, parallel:false}
);

// 9. (:Review)-[:REVIEWS]->(:Book)
CALL apoc.periodic.iterate(
  "MATCH (r:Review) RETURN r",
  "MATCH (b:Book {book_id: r.book_id})
   MERGE (r)-[:REVIEWS]->(b)",
  {batchSize:10000, parallel:false}
);