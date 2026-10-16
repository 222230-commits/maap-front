import { Component, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.scss'
})
export class SplashScreenComponent implements OnInit {
  isVisible = signal(true);
  progress = signal(0);

  ngOnInit(): void {
    // progress bar animation
    let p = 0;
    const timer = setInterval(() => {
      p += 2;
      this.progress.set(p);
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          this.isVisible.set(false);
        }, 300);
      }
    }, 30);
  }
}
