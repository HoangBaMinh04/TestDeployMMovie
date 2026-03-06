using System.ComponentModel.DataAnnotations;

namespace MovieWeb.Service.Tmdb
{
    public class TmdbOptions
    {
        /// The TMDB v3 API key. Optional when a bearer token is provided.
        public string? ApiKey { get; set; }

        /// TMDB v4 read access token. When provided the client will use the Bearer token header.
        public string? BearerToken { get; set; }

        /// Base URL for TMDB images. Defaults to https://image.tmdb.org/t/p.
        [Required]
        public string ImageBaseUrl { get; set; } = "https://image.tmdb.org/t/p";

        /// Poster size segment appended between the base URL and the poster path.
        /// Example: w500, original.
        [Required]
        public string PosterSize { get; set; } = "w500";
        public string Language { get; set; } = "vi-VN";

    }
}