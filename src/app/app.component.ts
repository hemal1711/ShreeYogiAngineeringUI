import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageTitleService } from './core/services/page-title.service';
import { AppLoaderComponent } from './shared/app-loader/app-loader.component';
import { ConfirmationDialogComponent } from './shared/components/confirmation-dialog';
import { ToastComponent } from './shared/components/toast';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppLoaderComponent, ConfirmationDialogComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(private readonly pageTitleService: PageTitleService) {
    this.pageTitleService.init();
  }
}
