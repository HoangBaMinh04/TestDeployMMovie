using MovieWeb.Entities;

namespace MovieWeb.Service.Movie
{
    public class MovieDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string? Slug { get; set; }
        public Quality Quality { get; set; }
        public int? Year { get; set; }
        public int? Duration { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public AgeRating? AgeRating { get; set; }
        public string? TrailerUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? PosterUrl { get; set; }
        public bool IsPublished { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal? AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public bool IsDeleted { get; set; }


        // Country
        public long CountryId { get; set; }
        public string? CountryName { get; set; }

        // Categories
        public List<MovieCategoryInfo> Categories { get; set; } = new();
    }

    public class MovieCategoryInfo
    {
        public long CategoryId { get; set; }
        public string CategoryName { get; set; } = default!;
        public bool IsPrimary { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class CreateMovieDto
    {
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string? Slug { get; set; }
        public Quality Quality { get; set; } = Quality.HD;
        public int? Year { get; set; }
        public int? Duration { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public AgeRating? AgeRating { get; set; }
        public string? TrailerUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? PosterUrl { get; set; }
        public long CountryId { get; set; }

        // Categories với metadata
        public List<CreateMovieCategoryDto> Categories { get; set; } = new();
    }

    public class CreateMovieCategoryDto
    {
        public long CategoryId { get; set; }
        public bool IsPrimary { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class UpdateMovieDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Description { get; set; }
        public string? Slug { get; set; }
        public Quality Quality { get; set; } = Quality.HD;
        public int? Year { get; set; }
        public int? Duration { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public AgeRating? AgeRating { get; set; }
        public string? TrailerUrl { get; set; }
        public string? ThumbnailUrl { get; set; }
        public string? PosterUrl { get; set; }
        public bool IsPublished { get; set; }
        public long CountryId { get; set; }
        public List<CreateMovieCategoryDto> Categories { get; set; } = new();
    }
}
