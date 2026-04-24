import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/services/auth.service';
import { LoginRequest } from '../../core/models/auth.model';
import { ToastService } from '../../shared/components/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toastService = inject(ToastService);

  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';  

  readonly loginForm = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  constructor() {
    if (this.authService.isAuthenticatedSync()) {
      void this.router.navigateByUrl('/dashboard');
    }
  }

  get formControls() {
    return this.loginForm.controls;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((current) => !current);
  }

  onSubmit(): void {
    this.submitted.set(true);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.toastService.warning('Please enter your login details before continuing.', 'Login details required');
      return;
    }

    this.loading.set(true);
    const formValue = this.loginForm.getRawValue();
    const credentials: LoginRequest = {
      identifier: formValue.identifier,
      password: formValue.password
    };

    this.authService.login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.loading.set(false);
          this.toastService.success('You are signed in successfully.', 'Welcome back');
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (error) => {
          this.loading.set(false);
          this.toastService.error(
            error?.error?.message || 'We could not sign you in with those credentials.',
            'Sign-in failed'
          );
        }
      });
  }
}
