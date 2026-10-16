import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Interest {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  address: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  interests: Interest[];
}

export interface UserProfileResponse {
  success: boolean;
  data: UserProfile;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private readonly BASE = environment.apiUrl;

  getProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(
      `${this.BASE}/user/profile/Show`
    );
  }

  updateInterests(category_ids: string[]): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.BASE}/user/profile/interests`,
      { category_ids }
    );
  }

  // POST /user/profile/update
  // Headers: Bearer Token
  // Body: {
  //   full_name?: string,
  //   phone_number?: string,
  //   address?: string
  // }
  // Response: { success: true, message, data: UserProfile }
  // ملاحظة: الإيميل لا يتغير من هنا — له endpoint منفصل
  updateProfile(data: {
    full_name?: string;
    phone_number?: string;
    address?: string;
  }): Observable<UserProfileResponse> {
    return this.http.post<UserProfileResponse>(
      `${this.BASE}/user/profile/update`, data
    );
  }

  // POST /user/profile/avatar
  // Headers: Bearer Token
  // Body: FormData فيه حقل "avatar" (File)
  // ملاحظة: ترفع أيضاً كـ "avatar_url" للتوافق
  // Response: { success: true, data: { avatar_url } }
  updateAvatar(file: File): Observable<any> {
    const form = new FormData();
    form.append('avatar', file);
    form.append('avatar_url', file);
    return this.http.post<any>(
      `${this.BASE}/user/profile/avatar`, form
    );
  }

  // POST /user/change-email/request
  // Headers: Bearer Token
  // Body: { email: "new@email.com", new_email: "new@email.com" }
  // Response: { success: true, message }
  requestEmailChange(newEmail: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/user/change-email/request`,
      { email: newEmail, new_email: newEmail }
    );
  }

  // POST /user/change-email/verify
  // Headers: Bearer Token
  // Body: { email: "new@email.com", otp_code: "1234" }
  // Response: { success: true, message }
  verifyEmailChange(email: string, otp_code: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.BASE}/user/change-email/verify`,
      { email, new_email: email, otp_code, otp: otp_code }
    );
  }
}
