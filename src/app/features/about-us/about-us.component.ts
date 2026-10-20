import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface TeamMember {
  name: string;
  role: string;
  image: string;
  alt: string;
}

@Component({
  selector: 'app-about-us',
  imports: [CommonModule, RouterModule],
  templateUrl: './about-us.component.html',
  styleUrl: './about-us.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutUsComponent {
  teamMembers: TeamMember[] = [
    {
      name: 'هدى سليمان الشريف',
      role: 'هندسة البرمجيات وتطوير النظم',
      image: 'assets/about-us/voidcat.png',
      alt: 'صورة المهندسة هدى سليمان الشريف'
    },
    {
      name: 'غالية عادل ماقورة',
      role: 'هندسة البرمجيات وتطوير النظم',
      image: 'assets/about-us/ice.jpg',
      alt: 'صورة المهندسة غالية عادل ماقورة'
    },
    {
      name: 'وعد وحيد الشح',
      role: 'هندسة البرمجيات وتطوير النظم',
      image: 'assets/about-us/waed.png',
      alt: 'صورة المهندسة وعد وحيد الشح'
    }
  ];
}
