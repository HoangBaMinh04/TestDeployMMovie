using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Runtime.Serialization;

namespace MovieWeb.Entities
{
    [Table("Movies")]
    [Index(nameof(Slug), IsUnique = true)]
    [Index(nameof(IsPublished), nameof(ReleaseDate))]
    public class Movie
    {
        public long Id { get; set; }

        [Required, MaxLength(200)]
        public string Name { get; set; } = default!;

        [MaxLength(2000)]
        public string? Description { get; set; }

        [MaxLength(250)]
        public string? Slug { get; set; }

        public Quality Quality { get; set; } = Quality.HD;

        [Range(1900, 2100)]
        public int? Year { get; set; }

        [Range(1, 500)]
        public int? Duration { get; set; }

        public DateTime? ReleaseDate { get; set; }
        public AgeRating? AgeRating { get; set; }

        [MaxLength(500)]
        public string? TrailerUrl { get; set; }

        [MaxLength(500)]
        public string? ThumbnailUrl { get; set; }

        [MaxLength(500)]
        public string? PosterUrl { get; set; }

        // Observability
        public bool IsPublished { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public bool IsDeleted { get; set; }

        // Aggregated review metrics
        [Precision(5, 2)]
        public decimal AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalRating1Star { get; set; }
        public int TotalRating2Star { get; set; }
        public int TotalRating3Star { get; set; }
        public int TotalRating4Star { get; set; }
        public int TotalRating5Star { get; set; }

        // Foreign Keys
        public long CountryId { get; set; }

        // Navigation
        public Country Country { get; set; } = default!;
        public ICollection<MovieCategory> MovieCategories { get; set; } = new List<MovieCategory>();
        public ICollection<Showtime> Showtimes { get; set; } = new List<Showtime>();
        public ICollection<MovieReview> Reviews { get; set; } = new List<MovieReview>();
    }

    public enum AgeRating
    {
        K,   // Không giới hạn
        P,   // Phù hợp mọi lứa tuổi
        T13, // Trên 13 tuổi
        T16, // Trên 16 tuổi
        T18, // Trên 18 tuổi
        C    // Cấm chiếu
    }

    public enum Quality
    {
        [EnumMember(Value = "CAM")]
        CAM,

        [EnumMember(Value = "SD")]
        SD,

        [EnumMember(Value = "HD")]
        HD,

        [EnumMember(Value = "FullHD")]
        FullHD,

        [EnumMember(Value = "2K")]
        _2K,

        [EnumMember(Value = "4K")]
        _4K,

        [EnumMember(Value = "8K")]
        _8K,

        [EnumMember(Value = "BluRay")]
        BluRay,

        [EnumMember(Value = "WEB-DL")]
        WebDL
    }


}
