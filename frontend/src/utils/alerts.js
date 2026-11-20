import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export async function confirmAction({
  title,
  text,
  confirmButtonText = 'Continue',
  icon = 'warning',
}) {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#b91c1c',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export function showError(message, title = 'Error') {
  return Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: '#b91c1c',
  });
}

export function showSuccess(message, title = 'Success') {
  return Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: '#b91c1c',
  });
}

export function showNotificationAlert({ title, body }) {
  return Swal.fire({
    icon: 'info',
    title: title || 'MeatLink',
    text: body || '',
    confirmButtonText: 'OK',
    confirmButtonColor: '#b91c1c',
  });
}
