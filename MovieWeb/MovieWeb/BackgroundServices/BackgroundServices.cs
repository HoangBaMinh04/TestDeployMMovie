using MovieWeb.Service.Order;

namespace MovieWeb.BackgroundServices
{
    public class ExpiredOrderProcessorService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ExpiredOrderProcessorService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(1);

        public ExpiredOrderProcessorService(
            IServiceProvider serviceProvider,
            ILogger<ExpiredOrderProcessorService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Expired Order Processor Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessExpiredOrders();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred while processing expired orders");
                }

                // Wait for next check
                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("Expired Order Processor Service stopped");
        }

        private async Task ProcessExpiredOrders()
        {
            using var scope = _serviceProvider.CreateScope();
            var orderService = scope.ServiceProvider.GetRequiredService<IOrderService>();

            _logger.LogDebug("Checking for expired orders...");

            try
            {
                await orderService.ProcessExpiredOrdersAsync();
                _logger.LogDebug("Expired orders processed successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process expired orders");
                throw;
            }
        }

        public override async Task StopAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Expired Order Processor Service is stopping");
            await base.StopAsync(stoppingToken);
        }
    }
}
