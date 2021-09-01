import * as t from 'io-ts'

export const openGraph = {
    title : 'og:title',
    url : 'og:url',
    type : 'og:type',

    description : 'og:description',
    determiner : 'og:determiner',
    locale : 'og:locale',
    site_name : 'og:site_name',

    image: 'og:image',
    image_url: 'og:image:url',
    image_secure_url: 'og:image:secure_url',
    image_type: 'og:image:type',
    image_width: 'og:image:width',
    image_height: 'og:image:height',
    image_alt: 'og:image:alt',

    video: 'og:video',
    video_url: 'og:video:url',
    video_secure_url: 'og:video:secure_url',
    video_type: 'og:video:type',
    video_width: 'og:video:width',
    video_height: 'og:video:height',
    video_alt: 'og:video:alt',
    
    audio : 'og:audio',
    audio_secure_url : 'og:audio:secure_url',
    audio_type : 'og:audio:type',
    music_duration : 'og:music:duration',
    music_album : 'og:music:album',
    music_musician : 'og:music:musician',
    music_song : 'og:music:song',
    music_release_date : 'og:music:release_date',
    music_playlist : 'og:music.playlist',
    music_creator : 'og:music:creator',
    music_radio_station : 'og:music.radio_station',
    music_song_disc: 'og:music:song:disc',
    music_song_track: 'og:music:song:track',
    music_album_disc: 'og:music.album.disc',
    music_album_track: 'og:music.album.track',

    video_movie : 'og:video.movie',
    video_actor : 'og:video:actor',
    video_actor_role : 'og:video:actor:role',
    video_director : 'og:video:director',
    video_writer : 'og:video:writer',
    video_duration : 'og:video:duration',
    video_release_date : 'og:video:release_date',
    video_tag : 'og:video:tag',
    video_episode : 'og:video.episode',
    video_series : 'og:video:series',
    video_tv_show : 'og:video.tv_show',
    video_other : 'og:video.other',

    article_published_time : 'og:article:published_time',
    article_modified_time : 'og:article:modified_time',
    article_expiration_time : 'og:article:expiration_time',
    article_author : 'og:article:author',
    article_section : 'og:article:section',
    article_tag : 'og:article:tag',
    
    book_author : 'og:book:author',
    book_isbn : 'og:book:isbn',
    book_release_date : 'og:book:release_date',
    book_tag : 'og:book:tag',
    
    profile_first_name : 'og:profile:first_name',
    profile_last_name : 'og:profile:last_name',
    profile_username : 'og:profile:username',
    profile_gender : 'og:profile:gender'
} as const

export type OGPrefixes = typeof openGraph[keyof typeof openGraph];

export const twCards = {
    card: 'twitter:card',
    site: 'twitter:site',
    creator: 'twitter:creator',
    title: 'twitter:title',
    description: 'twitter:description',
    image: 'twitter:image',
    image_alt: 'twitter:image:alt',
    player: 'twitter:player',
    player_width: 'twitter:player:width',
    player_height: 'twitter:player:height',
    player_stream: 'twitter:player:stream',
    app_name_iphone: 'twitter:app:name:iphone',
    app_id_iphone: 'twitter:app:id:iphone',
    app_url_iphone: 'twitter:app:url:iphone',
    app_name_ipad: 'twitter:app:name:ipad',
    app_id_ipad: 'twitter:app:id:ipad',
    app_url_ipad: 'twitter:app:url:ipad',
    app_name_googleplay: 'twitter:app:name:googleplay',
    app_id_googleplay: 'twitter:app:id:googleplay',
    app_url_googleplay: 'twitter:app:url:googleplay',
} as const

const twCardSummary = t.type({
    [twCards.card]: t.literal("summary"),
    [twCards.title]: t.string,
    [twCards.description]:  t.string,
    [twCards.site]: t.string,
    [twCards.image]: t.string,
    [twCards.image_alt]: t.string,
})

const twitterCardSummaryWithLargeImage = t.type({
    [twCards.card]: t.literal("summary_large_image"),
    [twCards.title]: t.string,
    [twCards.description]:  t.string,
    [twCards.site]: t.string,
    [twCards.creator]: t.string,
    [twCards.image]: t.string,
    [twCards.image_alt]: t.string,
})
