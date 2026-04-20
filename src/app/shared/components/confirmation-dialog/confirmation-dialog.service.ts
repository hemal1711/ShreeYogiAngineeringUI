import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfirmationDialogConfig } from './confirmation-dialog.component';

export interface DialogState {
  isVisible: boolean;
  config: ConfirmationDialogConfig | null;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationDialogService {
  private readonly initialState: DialogState = {
    isVisible: false,
    config: null
  };

  private dialogStateSubject = new BehaviorSubject<DialogState>(this.initialState);
  public dialogState$ = this.dialogStateSubject.asObservable();

  private resolveCallback: ((value: boolean) => void) | null = null;

  /**
   * Show a confirmation dialog and wait for user response
   * @param config Dialog configuration
   * @returns Promise<boolean> - true if confirmed, false if cancelled
   */
  show(config: ConfirmationDialogConfig): Promise<boolean> {
    return new Promise(resolve => {
      this.resolveCallback = resolve;
      this.dialogStateSubject.next({
        isVisible: true,
        config
      });
    });
  }

  /**
   * Show a delete confirmation dialog
   * @param itemName Name of the item being deleted
   * @param count Number of items (optional)
   * @returns Promise<boolean>
   */
  showDelete(itemName: string, count: number = 1): Promise<boolean> {
    const config: ConfirmationDialogConfig = {
      title: count > 1 ? 'Delete Multiple Items?' : 'Delete This Item?',
      message: count > 1
        ? `You are about to delete ${count} ${itemName}(s). This action cannot be undone.`
        : `You are about to delete this ${itemName}. This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    };
    return this.show(config);
  }

  /**
   * Show a warning confirmation dialog
   * @param title Dialog title
   * @param message Dialog message
   * @returns Promise<boolean>
   */
  showWarning(title: string, message: string, additionalContent?: string): Promise<boolean> {
    const config: ConfirmationDialogConfig = {
      title,
      message,
      content: additionalContent,
      confirmText: 'Proceed',
      cancelText: 'Cancel',
      type: 'warning'
    };
    return this.show(config);
  }

  /**
   * Show a save confirmation dialog
   * @param itemName Name of the item being saved
   * @returns Promise<boolean>
   */
  showSave(itemName: string): Promise<boolean> {
    const config: ConfirmationDialogConfig = {
      title: 'Save Changes?',
      message: `You have unsaved changes to this ${itemName}.`,
      content: 'Do you want to save these changes before leaving?',
      confirmText: 'Save',
      cancelText: 'Discard',
      type: 'warning'
    };
    return this.show(config);
  }

  /**
   * Show a success confirmation dialog
   * @param title Dialog title
   * @param message Dialog message
   * @returns Promise<boolean>
   */
  showSuccess(title: string, message: string): Promise<boolean> {
    const config: ConfirmationDialogConfig = {
      title,
      message,
      confirmText: 'OK',
      type: 'success'
    };
    return this.show(config);
  }

  /**
   * Show an info dialog
   * @param title Dialog title
   * @param message Dialog message
   * @returns Promise<boolean>
   */
  showInfo(title: string, message: string): Promise<boolean> {
    const config: ConfirmationDialogConfig = {
      title,
      message,
      confirmText: 'OK',
      type: 'info'
    };
    return this.show(config);
  }

  /**
   * User confirmed the dialog
   */
  confirm(): void {
    this.close(true);
  }

  /**
   * User cancelled the dialog
   */
  cancel(): void {
    this.close(false);
  }

  /**
   * Close the dialog and resolve promise
   */
  private close(result: boolean): void {
    this.dialogStateSubject.next(this.initialState);
    if (this.resolveCallback) {
      this.resolveCallback(result);
      this.resolveCallback = null;
    }
  }
}
