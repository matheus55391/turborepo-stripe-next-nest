import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  describe('getMetrics', () => {
    it('should return Prometheus-format metrics string', async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('cache_hits_total');
      expect(metrics).toContain('cache_misses_total');
      expect(metrics).toContain('rabbitmq_messages_processed_total');
      expect(metrics).toContain('rabbitmq_messages_failed_total');
      expect(metrics).toContain('auth_attempts_total');
    });

    it('should include default Node.js metrics after init', async () => {
      const metrics = await service.getMetrics();
      expect(metrics).toContain('process_cpu');
      expect(metrics).toContain('nodejs_heap_size');
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus content type', () => {
      const contentType = service.getContentType();
      expect(contentType).toContain('text/plain');
    });
  });

  describe('counters and histograms', () => {
    it('should increment cache hit counter', async () => {
      service.cacheHitsTotal.inc({ key_prefix: 'page' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain('cache_hits_total{key_prefix="page"} 1');
    });

    it('should increment cache miss counter', async () => {
      service.cacheMissesTotal.inc({ key_prefix: 'page' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain('cache_misses_total{key_prefix="page"} 1');
    });

    it('should increment queue processed counter', async () => {
      service.queueProcessedTotal.inc({ queue: 'click-tracking' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain(
        'rabbitmq_messages_processed_total{queue="click-tracking"} 1',
      );
    });

    it('should increment queue failed counter', async () => {
      service.queueFailedTotal.inc({ queue: 'click-tracking' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain(
        'rabbitmq_messages_failed_total{queue="click-tracking"} 1',
      );
    });

    it('should increment auth attempt counter', async () => {
      service.authAttemptsTotal.inc({ action: 'login', result: 'success' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain(
        'auth_attempts_total{action="login",result="success"} 1',
      );
    });

    it('should record http request duration', async () => {
      const end = service.httpRequestDuration.startTimer();
      end({ method: 'GET', route: '/health', status_code: '200' });
      const metrics = await service.getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_bucket');
    });
  });
});
