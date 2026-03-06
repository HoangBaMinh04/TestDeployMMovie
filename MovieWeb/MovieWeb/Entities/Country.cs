using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MovieWeb.Entities
{
    [Table("Countries")]
    public class Country
    {
        public long Id { get; set; }

        [Required, MaxLength(100)]
        public string Name { get; set; } = default!;

        [Required, MaxLength(5)]
        public string Code { get; set; } = default!; // VN, US, KR...

        // Navigation
        public ICollection<Movie> Movies { get; set; } = new List<Movie>();
    }
}
