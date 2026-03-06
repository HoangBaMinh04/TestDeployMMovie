namespace MovieWeb.Service.UserProfile
{
    public class UserProfileDto
    {
        public long Id { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public DateTime? DateOfBirth { get; set; }
    }
    public class UpdateUserProfileDto
    {
        public string? FullName { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? PhoneNumber { get; set; }
    }

}
