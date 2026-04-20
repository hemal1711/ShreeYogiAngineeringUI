import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmationDialogService } from './confirmation-dialog.service';

export interface ConfirmationDialogConfig {
  title: string;
  message: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isVisible()) {
      <div class="confirmation-backdrop" (click)="onBackdropClick()">
        <div class="confirmation-dialog animated" [class]="'dialog-' + config().type">
          <!-- Icon -->
          <div class="dialog-icon">
            @switch (config().type) {
              @case ('danger') {
                <i class="bi bi-exclamation-triangle"></i>
              }
              @case ('warning') {
                <i class="bi bi-exclamation-circle"></i>
              }
              @case ('success') {
                <i class="bi bi-check-circle"></i>
              }
              @default {
                <i class="bi bi-info-circle"></i>
              }
            }
          </div>

          <!-- Content -->
          <div class="dialog-content">
            <h2 class="dialog-title">{{ config().title }}</h2>
            <p class="dialog-message">{{ config().message }}</p>
            @if (config().content) {
              <div class="dialog-description">
                {{ config().content }}
              </div>
            }
          </div>

          <!-- Actions -->
          <div class="dialog-actions">
            <button
              type="button"
              (click)="onCancel()"
              class="btn btn-outline-secondary"
            >
              {{ config().cancelText || 'Cancel' }}
            </button>
            <button
              type="button"
              (click)="onConfirm()"
              [class]="'btn btn-' + (config().type === 'danger' ? 'danger' : 'primary')"
            >
              {{ config().confirmText || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .confirmation-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      animation: fadeIn 0.2s ease-in-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .confirmation-dialog {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 40px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      animation: slideUp 0.3s ease-out;

      &.animated {
        transform: scale(1);
      }

      &.dialog-danger {
        border-top: 4px solid #dc3545;

        .dialog-icon {
          color: #dc3545;
        }
      }

      &.dialog-warning {
        border-top: 4px solid #ffc107;

        .dialog-icon {
          color: #ffc107;
        }
      }

      &.dialog-success {
        border-top: 4px solid #28a745;

        .dialog-icon {
          color: #28a745;
        }
      }

      &.dialog-info {
        border-top: 4px solid #17a2b8;

        .dialog-icon {
          color: #17a2b8;
        }
      }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dialog-icon {
      font-size: 48px;
      margin-bottom: 20px;
      display: inline-block;
    }

    .dialog-content {
      margin-bottom: 30px;
    }

    .dialog-title {
      font-size: 20px;
      font-weight: 600;
      color: #2d3436;
      margin: 0 0 12px 0;
    }

    .dialog-message {
      font-size: 14px;
      color: #636e72;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }

    .dialog-description {
      font-size: 13px;
      background: #f8f9fa;
      border-left: 3px solid #007bff;
      padding: 12px 15px;
      border-radius: 4px;
      color: #495057;
      text-align: left;
      line-height: 1.4;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;

      .btn {
        padding: 10px 24px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: translateY(-2px);
        }

        &:active {
          transform: translateY(0);
        }
      }

      .btn-primary {
        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        color: white;

        &:hover {
          background: linear-gradient(135deg, #0056b3 0%, #003d82 100%);
        }
      }

      .btn-danger {
        background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%);
        color: white;

        &:hover {
          background: linear-gradient(135deg, #bd2130 0%, #a71d2a 100%);
        }
      }

      .btn-outline-secondary {
        background: white;
        color: #6c757d;
        border: 1px solid #dee2e6;

        &:hover {
          background: #f8f9fa;
          border-color: #adb5bd;
        }
      }
    }

    @media (max-width: 576px) {
      .confirmation-dialog {
        padding: 30px;
        max-width: 95%;

        .dialog-title {
          font-size: 18px;
        }

        .dialog-message {
          font-size: 13px;
        }

        .dialog-actions {
          flex-direction: column;

          .btn {
            width: 100%;
          }
        }
      }
    }
  `
})
export class ConfirmationDialogComponent {
  private readonly dialogService = inject(ConfirmationDialogService);

  isVisible = signal(false);
  config = signal<ConfirmationDialogConfig>({
    title: 'Confirm',
    message: 'Are you sure?',
    type: 'info'
  });

  constructor() {
    this.dialogService.dialogState$.subscribe(state => {
      this.isVisible.set(state.isVisible);
      if (state.config) {
        this.config.set(state.config);
      }
    });
  }

  onConfirm(): void {
    this.dialogService.confirm();
  }

  onCancel(): void {
    this.dialogService.cancel();
  }

  onBackdropClick(): void {
    this.dialogService.cancel();
  }
}
