import { HealthController } from '../../modules/health/health.controller';
import { SystemClock } from '../../infrastructure/clock/system.clock';
import { type Clock } from '../ports/clock.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenSigner } from '../ports/token-signer.port';
import { Mailer } from '../ports/mailer.port';
import { Argon2PasswordHasher } from '../../infrastructure/hashing/argon2.password-hasher';
import { JwtTokenSigner } from '../../infrastructure/tokens/jwt.token-signer';
import { ConsoleMailer } from '../../infrastructure/mailer/console.mailer';
import { ResendMailer } from '../../infrastructure/mailer/resend.mailer';
import { UserRepository } from '../../modules/auth/repositories/user.repository';
import { SessionRepository } from '../../modules/auth/repositories/session.repository';
import { OneTimeTokenRepository } from '../../modules/auth/repositories/one-time-token.repository';
import { OptionSeedService } from '../../modules/auth/services/option-seed.service';
import { AuthCommandService } from '../../modules/auth/services/auth-command.service';
import { GoogleAuthService } from '../../modules/auth/services/google-auth.service';
import { AuthController } from '../../modules/auth/controllers/auth.controller';
import { MeController } from '../../modules/users/controllers/me.controller';
import { createAuthenticateMiddleware } from '../middleware/authenticate.middleware';
import { config } from '../../config/config';
import { RequestHandler } from 'express';

import { OptionRepository } from '../../modules/options/repositories/option.repository';
import { OptionCommandService } from '../../modules/options/services/option-command.service';
import { OptionQueryService } from '../../modules/options/services/option-query.service';
import { OptionController } from '../../modules/options/controllers/option.controller';

import { CompanyRepository } from '../../modules/companies/repositories/company.repository';
import { CompanyService } from '../../modules/companies/services/company.service';
import { CompanyController } from '../../modules/companies/controllers/company.controller';

import { ActivityRepository } from '../../modules/activities/repositories/activity.repository';
import { ActivityController } from '../../modules/activities/controllers/activity.controller';

import { CommentRepository } from '../../modules/comments/repositories/comment.repository';
import { CommentService } from '../../modules/comments/services/comment.service';
import { CommentController } from '../../modules/comments/controllers/comment.controller';

import { ApplicationRepository } from '../../modules/applications/repositories/application.repository';
import { ApplicationCommandService } from '../../modules/applications/services/application-command.service';
import { ApplicationQueryService } from '../../modules/applications/services/application-query.service';
import { ApplicationController } from '../../modules/applications/controllers/application.controller';

import { UserCompanyNotesRepository } from '../../modules/companies/repositories/user-company-notes.repository';
import { DashboardAggregationService } from '../../modules/dashboard/services/dashboard-aggregation.service';
import { DashboardController } from '../../modules/dashboard/controllers/dashboard.controller';

import { type AiProvider } from '../ports/ai-provider.port';
import { type WebPageFetcher } from '../ports/web-page-fetcher.port';
import { GeminiAiProvider } from '../../infrastructure/ai/gemini/gemini.ai-provider';
import { UnconfiguredAiProvider } from '../../infrastructure/ai/unconfigured.ai-provider';
import { SafeWebPageFetcher } from '../../infrastructure/fetcher/safe-web-page-fetcher';
import { AiFeature } from '@hiretrail/shared';
import { AiUsageRepository } from '../../modules/ai/repositories/ai-usage.repository';
import { AiQuotaService } from '../../modules/ai/services/ai-quota.service';
import { AutofillService } from '../../modules/ai/services/autofill.service';
import { AiController } from '../../modules/ai/controllers/ai.controller';
import { CompanyVerificationRepository } from '../../modules/companies/repositories/company-verification.repository';
import { AiLookupCacheRepository } from '../../modules/companies/repositories/ai-lookup-cache.repository';
import { CompanyVerificationService } from '../../modules/companies/services/company-verification.service';
import { CompanyLookupService } from '../../modules/companies/services/company-lookup.service';
import { ProviderHealthRepository } from '../../modules/ai/repositories/provider-health.repository';
import { ExternalUsageRepository } from '../../modules/ai/repositories/external-usage.repository';
import { TavilyWebSearch } from '../../infrastructure/search/tavily.web-search';
import { CompanyEvidenceService } from '../../modules/companies/services/company-evidence.service';
import { CompanyNoteRepository } from '../../modules/companies/repositories/company-note.repository';
import { CompanyNoteService } from '../../modules/companies/services/company-note.service';
import { CompanyNoteController } from '../../modules/companies/controllers/company-note.controller';
import { CompanyAiController } from '../../modules/companies/controllers/company-ai.controller';

import { AuditLogRepository } from '../../modules/admin/repositories/audit-log.repository';
import { AdminUserService } from '../../modules/admin/services/admin-user.service';
import { AdminCompanyService } from '../../modules/admin/services/admin-company.service';
import { AdminReportsService } from '../../modules/admin/services/admin-reports.service';
import { AdminController } from '../../modules/admin/controllers/admin.controller';
import { ImportRepository } from '../../modules/applications/repositories/import.repository';
import { ApplicationExportService } from '../../modules/applications/services/application-export.service';
import { ApplicationImportService } from '../../modules/applications/services/application-import.service';
import { ApplicationDataController } from '../../modules/applications/controllers/application-data.controller';
import { AiInsightsRepository } from '../../modules/dashboard/repositories/ai-insights.repository';
import { DashboardInsightsService } from '../../modules/dashboard/services/dashboard-insights.service';
import { AccountService } from '../../modules/users/services/account.service';

export class Container {
  private static instance: Container | null = null;

  // Ports / Infrastructure
  public readonly clock: Clock;
  public readonly passwordHasher: PasswordHasher;
  public readonly tokenSigner: TokenSigner;
  public readonly mailer: Mailer;
  public readonly aiProvider: AiProvider;
  public readonly webPageFetcher: WebPageFetcher;

  // Repositories
  public readonly userRepo: UserRepository;
  public readonly sessionRepo: SessionRepository;
  public readonly tokenRepo: OneTimeTokenRepository;
  public readonly optionRepo: OptionRepository;
  public readonly companyRepo: CompanyRepository;
  public readonly companyNotesRepo: UserCompanyNotesRepository;
  public readonly activityRepo: ActivityRepository;
  public readonly commentRepo: CommentRepository;
  public readonly applicationRepo: ApplicationRepository;

  // Services
  public readonly optionSeedService: OptionSeedService;
  public readonly authCommandService: AuthCommandService;
  public readonly googleAuthService: GoogleAuthService;
  public readonly optionCommandService: OptionCommandService;
  public readonly optionQueryService: OptionQueryService;
  public readonly companyService: CompanyService;
  public readonly commentService: CommentService;
  public readonly applicationCommandService: ApplicationCommandService;
  public readonly applicationQueryService: ApplicationQueryService;
  public readonly dashboardService: DashboardAggregationService;

  // Middleware
  public readonly authenticate: RequestHandler;

  // Controllers
  public readonly healthController: HealthController;
  public readonly authController: AuthController;
  public readonly meController: MeController;
  public readonly optionController: OptionController;
  public readonly companyController: CompanyController;
  public readonly activityController: ActivityController;
  public readonly commentController: CommentController;
  public readonly applicationController: ApplicationController;
  public readonly dashboardController: DashboardController;
  public readonly aiController: AiController;
  public readonly companyAiController: CompanyAiController;
  public readonly companyNoteController: CompanyNoteController;
  public readonly providerHealth: ProviderHealthRepository;
  public readonly adminController: AdminController;
  public readonly applicationDataController: ApplicationDataController;

  private constructor() {
    this.clock = new SystemClock();
    this.passwordHasher = new Argon2PasswordHasher();

    this.tokenSigner = new JwtTokenSigner(
      config.jwt.accessSecret,
      config.jwt.issuer,
      config.jwt.audience,
      config.jwt.accessTokenTtlMin,
    );

    // Console mailer when in development; Resend mailer in production / preview when key exists
    if (config.appEnv === 'development' || !config.email.apiKey) {
      this.mailer = new ConsoleMailer();
    } else {
      this.mailer = new ResendMailer(config.email.apiKey, config.email.from);
    }

    this.providerHealth = new ProviderHealthRepository();
    this.aiProvider =
      config.ai.enabled && config.ai.geminiApiKey
        ? new GeminiAiProvider(
            config.ai.geminiApiKey,
            {
              extract: config.ai.modelExtract,
              grounded: config.ai.modelGrounded,
              fallbacks: config.ai.modelFallbacks,
              groundedFallbacks: config.ai.modelGroundedFallbacks,
            },
            config.ai.toolsWithSchema,
            this.providerHealth,
          )
        : new UnconfiguredAiProvider();
    this.webPageFetcher = new SafeWebPageFetcher();

    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
    this.tokenRepo = new OneTimeTokenRepository();
    this.optionRepo = new OptionRepository();
    this.companyRepo = new CompanyRepository();
    this.companyNotesRepo = new UserCompanyNotesRepository();
    this.activityRepo = new ActivityRepository();
    this.commentRepo = new CommentRepository();
    this.applicationRepo = new ApplicationRepository();

    this.optionSeedService = new OptionSeedService();

    this.optionCommandService = new OptionCommandService(this.optionRepo);
    this.optionQueryService = new OptionQueryService(this.optionRepo);
    this.companyService = new CompanyService(
      this.companyRepo,
      this.companyNotesRepo,
      this.applicationRepo,
    );
    this.commentService = new CommentService(this.commentRepo, this.activityRepo);
    this.applicationCommandService = new ApplicationCommandService(
      this.applicationRepo,
      this.optionRepo,
      this.companyRepo,
      this.activityRepo,
    );
    this.applicationQueryService = new ApplicationQueryService(
      this.applicationRepo,
      this.optionRepo,
      this.companyRepo,
    );
    this.dashboardService = new DashboardAggregationService();

    this.authCommandService = new AuthCommandService(
      this.userRepo,
      this.sessionRepo,
      this.tokenRepo,
      this.optionSeedService,
      this.passwordHasher,
      this.tokenSigner,
      this.mailer,
      config.webAppUrl,
      config.jwt.refreshTokenTtlDays,
    );

    this.googleAuthService = new GoogleAuthService(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri,
      this.userRepo,
      this.sessionRepo,
      this.optionSeedService,
      this.tokenSigner,
      config.jwt.refreshTokenTtlDays,
    );

    this.authenticate = createAuthenticateMiddleware(
      this.tokenSigner,
      this.userRepo,
      this.sessionRepo,
    );

    this.healthController = new HealthController();
    this.authController = new AuthController(
      this.authCommandService,
      this.googleAuthService,
      config.ipHashSalt,
      config.appEnv === 'production',
      config.cookieSecret,
    );
    const exportService = new ApplicationExportService(
      this.applicationQueryService,
      this.optionRepo,
    );
    const accountService = new AccountService(exportService);
    this.meController = new MeController(
      this.userRepo,
      this.sessionRepo,
      this.authCommandService,
      this.passwordHasher,
      accountService,
    );
    this.optionController = new OptionController(
      this.optionCommandService,
      this.optionQueryService,
    );
    this.companyController = new CompanyController(this.companyService);
    this.companyNoteController = new CompanyNoteController(
      new CompanyNoteService(this.companyRepo, new CompanyNoteRepository(), this.companyNotesRepo),
    );
    this.activityController = new ActivityController(this.activityRepo);
    this.commentController = new CommentController(this.commentService);
    this.applicationController = new ApplicationController(
      this.applicationCommandService,
      this.applicationQueryService,
    );

    const aiUsageRepo = new AiUsageRepository();
    const aiQuotaService = new AiQuotaService(aiUsageRepo, this.clock, {
      enabled: config.ai.enabled,
      globalDailyLimit: config.ai.globalDailyLimit,
      perFeature: {
        [AiFeature.AUTOFILL]: config.ai.quotas.autofill,
        [AiFeature.COMPANY_VERIFY]: config.ai.quotas.companyVerify,
        [AiFeature.COMPANY_LOOKUP]: config.ai.quotas.companyLookup,
        [AiFeature.INSIGHTS]: config.ai.quotas.insights,
      },
    });
    const autofillService = new AutofillService(
      this.aiProvider,
      this.webPageFetcher,
      aiQuotaService,
      this.optionRepo,
      this.companyRepo,
    );
    this.aiController = new AiController(autofillService, aiQuotaService);

    this.dashboardController = new DashboardController(
      this.dashboardService,
      this.activityRepo,
      new DashboardInsightsService(
        this.aiProvider,
        aiQuotaService,
        this.dashboardService,
        new AiInsightsRepository(),
        this.clock,
      ),
    );

    this.applicationDataController = new ApplicationDataController(
      exportService,
      new ApplicationImportService(
        new ImportRepository(),
        this.optionRepo,
        this.optionCommandService,
        this.applicationCommandService,
      ),
    );

    const webSearch = new TavilyWebSearch(config.ai.tavilyApiKey);
    const externalUsage = new ExternalUsageRepository();
    const evidenceService = new CompanyEvidenceService(
      webSearch,
      this.webPageFetcher,
      this.providerHealth,
      externalUsage,
      { monthlyBudget: config.ai.tavilyMonthlyBudget, websiteGuess: config.ai.websiteGuess },
    );
    const verificationService = new CompanyVerificationService(
      this.aiProvider,
      this.webPageFetcher,
      aiQuotaService,
      this.companyRepo,
      new CompanyVerificationRepository(),
      evidenceService,
    );
    const lookupService = new CompanyLookupService(
      this.aiProvider,
      aiQuotaService,
      new AiLookupCacheRepository(),
      evidenceService,
    );
    this.companyAiController = new CompanyAiController(verificationService, lookupService);

    const auditRepo = new AuditLogRepository();
    this.adminController = new AdminController(
      new AdminUserService(this.sessionRepo, auditRepo),
      new AdminCompanyService(verificationService, auditRepo, this.companyNotesRepo, lookupService),
      new AdminReportsService(
        auditRepo,
        this.aiProvider,
        {
          enabled: config.ai.enabled,
          keyConfigured: Boolean(config.ai.geminiApiKey),
        },
        {
          health: this.providerHealth,
          usage: externalUsage,
          search: {
            provider: webSearch.id,
            configured: webSearch.isConfigured(),
            budget: config.ai.tavilyMonthlyBudget,
          },
        },
      ),
    );
  }

  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

export const container = Container.getInstance();
