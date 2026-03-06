namespace MovieWeb.Service.Country
{
    public class CountryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string Code { get; set; }
        public int MovieCount { get; set; }
    }

    public class CreateCountryDto
    {
        public string Name { get; set; } = default!;
        public string Code { get; set; }
    }

    public class UpdateCountryDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public string Code { get; set; } = default!;
    }
}
