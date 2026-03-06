namespace MovieWeb.Service.Category
{
    public class CategoryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Slug { get; set; }
        public string? Description { get; set; }
        public int MovieCount { get; set; }
    }

    public class CategoryDetailDto : CategoryDto
    {
        public List<CategoryMovieInfo> Movies { get; set; } = new();
    }

    public class CategoryMovieInfo
    {
        public long MovieId { get; set; }
        public string MovieName { get; set; } = default!;
        public bool IsPrimary { get; set; }
    }

    public class CreateCategoryDto
    {
        public string Name { get; set; } = default!;
        public string? Slug { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateCategoryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string? Slug { get; set; }
        public string? Description { get; set; }
    }
}
