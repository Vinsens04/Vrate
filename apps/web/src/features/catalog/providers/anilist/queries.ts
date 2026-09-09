export const ANILIST_SEARCH_QUERY = `
  query SearchAnime($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(search: $search, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
        id
        format
        title {
          userPreferred
          romaji
          english
          native
        }
        description(asHtml: false)
        coverImage {
          extraLarge
          large
          medium
          color
        }
        bannerImage
        startDate {
          year
          month
          day
        }
        episodes
        duration
        genres
        averageScore
        isAdult
        status
      }
    }
  }
`;

export const ANILIST_DETAIL_QUERY = `
  query GetAnimeDetail($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      format
      title {
        userPreferred
        romaji
        english
        native
      }
      description(asHtml: false)
      coverImage {
        extraLarge
        large
        medium
        color
      }
      bannerImage
      startDate {
        year
        month
        day
      }
      episodes
      duration
      genres
      averageScore
      isAdult
      status
    }
  }
`;
