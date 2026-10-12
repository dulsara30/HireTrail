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

export class Container {
  private static instance: Container | null = null;

  // Ports / Infrastructure
  public readonly clock: Clock;
  public readonly passwordHasher: PasswordHasher;
  public readonly tokenSigner: TokenSigner;
  public readonly mailer: Mailer;

  // Repositories
  public readonly userRepo: UserRepository;
  public readonly sessionRepo: SessionRepository;
  public readonly tokenRepo: OneTimeTokenRepository;
  public readonly optionRepo: OptionRepository;
  public readonly companyRepo: CompanyRepository;
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

    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
    this.tokenRepo = new OneTimeTokenRepository();
    this.optionRepo = new OptionRepository();
    this.companyRepo = new CompanyRepository();
    this.activityRepo = new ActivityRepository();
    this.commentRepo = new CommentRepository();
    this.applicationRepo = new ApplicationRepository();

    this.optionSeedService = new OptionSeedService();

    this.optionCommandService = new OptionCommandService(this.optionRepo);
    this.optionQueryService = new OptionQueryService(this.optionRepo);
    this.companyService = new CompanyService(this.companyRepo);
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
    this.meController = new MeController(
      this.userRepo,
      this.sessionRepo,
      this.authCommandService,
      this.passwordHasher,
    );
    this.optionController = new OptionController(
      this.optionCommandService,
      this.optionQueryService,
    );
    this.companyController = new CompanyController(this.companyService);
    this.activityController = new ActivityController(this.activityRepo);
    this.commentController = new CommentController(this.commentService);
    this.applicationController = new ApplicationController(
      this.applicationCommandService,
      this.applicationQueryService,
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
