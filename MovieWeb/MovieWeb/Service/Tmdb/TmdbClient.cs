using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text.Json.Serialization;

namespace MovieWeb.Service.Tmdb
{
    public interface ITmdbClient
    {
        Task<string?> TryGetPosterPathAsync(string title, int? year, CancellationToken cancellationToken = default);
        Task<string?> TryGetTrailerUrlAsync(string title, int? year, CancellationToken cancellationToken = default);
        Task<string?> TryGetOverviewAsync(string title, int? year, CancellationToken cancellationToken = default);
        string? BuildPosterUrl(string? posterPath);
    }

    public class TmdbClient : ITmdbClient
    {
        private readonly HttpClient _httpClient;
        private readonly TmdbOptions _options;
        private readonly ILogger<TmdbClient> _logger;

        private static readonly Uri DefaultBaseUri = new("https://api.themoviedb.org/3/");

        public TmdbClient(HttpClient httpClient, IOptions<TmdbOptions> options, ILogger<TmdbClient> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            if (_httpClient.BaseAddress is null)
            {
                _httpClient.BaseAddress = DefaultBaseUri;
            }
        }

        public async Task<string?> TryGetPosterPathAsync(string title, int? year, CancellationToken cancellationToken = default)
        {
            var candidates = await SearchMoviesAsync(title, year, cancellationToken);

            var withPoster = candidates
                .Where(r => !string.IsNullOrWhiteSpace(r.PosterPath))
                .ToList();

            if (withPoster.Count == 0)
                return null;

            var best = SelectBestCandidate(withPoster, year);
            return best?.PosterPath;
        }

        public async Task<string?> TryGetTrailerUrlAsync(string title, int? year, CancellationToken cancellationToken = default)
        {
            var candidates = await SearchMoviesAsync(title, year, cancellationToken);
            var best = SelectBestCandidate(candidates, year);

            if (best?.Id is null or 0)
                return null;

            var query = BuildMovieVideosQuery(best.Id.Value);
            using var request = CreateRequest(HttpMethod.Get, query);

            try
            {
                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("TMDB videos lookup failed with status code {Status} for {Title}", response.StatusCode, title);
                    return null;
                }

                var payload = await response.Content.ReadFromJsonAsync<TmdbVideoResponse>(cancellationToken: cancellationToken);
                var results = payload?.Results ?? new List<TmdbVideoDto>();

                if (results.Count == 0 && !string.IsNullOrWhiteSpace(_options.Language))
                {
                    var fallbackQuery = BuildMovieVideosQuery(best.Id.Value, includeLanguage: false);
                    using var fallbackRequest = CreateRequest(HttpMethod.Get, fallbackQuery);
                    using var fallbackResponse = await _httpClient.SendAsync(fallbackRequest, cancellationToken);

                    if (fallbackResponse.IsSuccessStatusCode)
                    {
                        var fallbackPayload = await fallbackResponse.Content.ReadFromJsonAsync<TmdbVideoResponse>(cancellationToken: cancellationToken);
                        results = fallbackPayload?.Results ?? new List<TmdbVideoDto>();
                    }
                    else
                    {
                        _logger.LogDebug("TMDB fallback videos lookup failed with status code {Status} for {Title}", fallbackResponse.StatusCode, title);
                    }
                }

                if (results.Count == 0)
                    return null;

                var trailers = results
                    .Where(v => string.Equals(v.Site, "YouTube", StringComparison.OrdinalIgnoreCase))
                    .Where(v => string.Equals(v.Type, "Trailer", StringComparison.OrdinalIgnoreCase))
                    .ToList();

                if (trailers.Count == 0)
                {
                    trailers = results
                        .Where(v => string.Equals(v.Site, "YouTube", StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }

                if (trailers.Count == 0)
                    return null;

                var selected = trailers.FirstOrDefault(v => v.Official) ?? trailers.First();
                return BuildVideoUrl(selected);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to fetch TMDB trailer for {Title}", title);
                return null;
            }
        }

        public string? BuildPosterUrl(string? posterPath)
        {
            if (string.IsNullOrWhiteSpace(posterPath))
                return null;

            var size = string.IsNullOrWhiteSpace(_options.PosterSize) ? "w500" : _options.PosterSize.Trim('/');
            var baseUrl = string.IsNullOrWhiteSpace(_options.ImageBaseUrl)
                ? "https://image.tmdb.org/t/p"
                : _options.ImageBaseUrl.TrimEnd('/');

            var normalizedPath = posterPath.StartsWith('/') ? posterPath : $"/{posterPath}";
            return $"{baseUrl}/{size}{normalizedPath}";
        }

        private string BuildSearchQuery(string title, int? year)
        {
            var encoded = Uri.EscapeDataString(title);
            var query = $"search/movie?include_adult=false&query={encoded}";

            if (year.HasValue)
            {
                query += $"&primary_release_year={year.Value}";
            }

            if (!string.IsNullOrWhiteSpace(_options.Language))
            {
                query += $"&language={Uri.EscapeDataString(_options.Language)}";
            }

            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            {
                query += $"&api_key={_options.ApiKey}";
            }

            return query;
        }

        private string BuildMovieVideosQuery(int movieId, bool includeLanguage = true)
        {
            var query = $"movie/{movieId}/videos";

            var parameters = new List<string>();

            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            {
                parameters.Add($"api_key={_options.ApiKey}");
            }

            if (includeLanguage && !string.IsNullOrWhiteSpace(_options.Language))
            {
                parameters.Add($"language={Uri.EscapeDataString(_options.Language)}");
            }

            if (parameters.Count > 0)
            {
                query += "?" + string.Join("&", parameters);
            }

            return query;
        }

        private string BuildMovieDetailsQuery(int movieId, bool includeLanguage = true)
        {
            var query = $"movie/{movieId}";
            var parameters = new List<string>();

            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
            {
                parameters.Add($"api_key={_options.ApiKey}");
            }

            if (includeLanguage && !string.IsNullOrWhiteSpace(_options.Language))
            {
                parameters.Add($"language={Uri.EscapeDataString(_options.Language)}");
            }

            if (parameters.Count > 0)
            {
                query += "?" + string.Join("&", parameters);
            }

            return query;
        }


        private async Task<List<TmdbMovieDto>> SearchMoviesAsync(string title, int? year, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(title))
                return new();

            if (string.IsNullOrWhiteSpace(_options.ApiKey) && string.IsNullOrWhiteSpace(_options.BearerToken))
            {
                _logger.LogDebug("TMDB credentials are missing. Skipping lookup for {Title}", title);
                return new();
            }

            var query = BuildSearchQuery(title, year);
            using var request = CreateRequest(HttpMethod.Get, query);

            try
            {
                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("TMDB search failed with status code {Status} for {Title}", response.StatusCode, title);
                    return new();
                }

                var payload = await response.Content.ReadFromJsonAsync<TmdbSearchResponse>(cancellationToken: cancellationToken);
                return payload?.Results ?? new();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to search TMDB for {Title}", title);
                return new();
            }
        }

        private HttpRequestMessage CreateRequest(HttpMethod method, string query)
        {
            var request = new HttpRequestMessage(method, query);

            if (!string.IsNullOrWhiteSpace(_options.BearerToken))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.BearerToken);
            }

            return request;
        }

        private static TmdbMovieDto? SelectBestCandidate(List<TmdbMovieDto> candidates, int? year)
        {
            if (candidates.Count == 0)
                return null;

            if (year.HasValue)
            {
                var yearMatches = candidates
                    .Where(r => TryParseYear(r.ReleaseDate) == year.Value)
                    .ToList();

                if (yearMatches.Count > 0)
                {
                    return yearMatches[0];
                }
            }

            return candidates[0];
        }

        private static string? BuildVideoUrl(TmdbVideoDto video)
        {
            if (string.IsNullOrWhiteSpace(video.Key))
                return null;

            if (string.Equals(video.Site, "YouTube", StringComparison.OrdinalIgnoreCase))
            {
                return $"https://www.youtube.com/watch?v={video.Key}";
            }

            if (string.Equals(video.Site, "Vimeo", StringComparison.OrdinalIgnoreCase))
            {
                return $"https://vimeo.com/{video.Key}";
            }

            return null;
        }

        private static int? TryParseYear(string? releaseDate)
        {
            if (string.IsNullOrWhiteSpace(releaseDate))
                return null;

            if (DateTime.TryParse(releaseDate, out var parsed))
            {
                return parsed.Year;
            }

            return null;
        }

        public async Task<string?> TryGetOverviewAsync(string title, int? year, CancellationToken cancellationToken = default)
        {
            var candidates = await SearchMoviesAsync(title, year, cancellationToken);
            var best = SelectBestCandidate(candidates, year);

            if (!string.IsNullOrWhiteSpace(best?.Overview))
            {
                return best.Overview.Trim();
            }

            // Fallback to English if overview is empty and language was specified
            if (best?.Id is not null && best.Id > 0 && !string.IsNullOrWhiteSpace(_options.Language))
            {
                var fallbackQuery = BuildMovieDetailsQuery(best.Id.Value, includeLanguage: false);
                using var fallbackRequest = CreateRequest(HttpMethod.Get, fallbackQuery);

                try
                {
                    using var fallbackResponse = await _httpClient.SendAsync(fallbackRequest, cancellationToken);
                    if (fallbackResponse.IsSuccessStatusCode)
                    {
                        var fallbackPayload = await fallbackResponse.Content.ReadFromJsonAsync<TmdbMovieDto>(cancellationToken: cancellationToken);
                        if (!string.IsNullOrWhiteSpace(fallbackPayload?.Overview))
                        {
                            return fallbackPayload.Overview.Trim();
                        }
                    }
                    else
                    {
                        _logger.LogDebug("TMDB fallback overview lookup failed with status code {Status} for {Title}", fallbackResponse.StatusCode, title);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to fetch TMDB fallback overview for {Title}", title);
                }
            }

            return null;
        }

        private sealed class TmdbSearchResponse
        {
            [JsonPropertyName("results")]
            public List<TmdbMovieDto> Results { get; set; } = new();
        }

        private sealed class TmdbMovieDto
        {
            [JsonPropertyName("id")]
            public int? Id { get; set; }

            [JsonPropertyName("poster_path")]
            public string? PosterPath { get; set; }

            [JsonPropertyName("release_date")]
            public string? ReleaseDate { get; set; }

            [JsonPropertyName("overview")]
            public string? Overview { get; set; }
        }

        private sealed class TmdbVideoResponse
        {
            [JsonPropertyName("results")]
            public List<TmdbVideoDto> Results { get; set; } = new();
        }

        private sealed class TmdbVideoDto
        {
            [JsonPropertyName("key")]
            public string? Key { get; set; }

            [JsonPropertyName("site")]
            public string? Site { get; set; }

            [JsonPropertyName("type")]
            public string? Type { get; set; }

            [JsonPropertyName("official")]
            public bool Official { get; set; }
        }
    }
}