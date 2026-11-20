import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

export async function confirmAction({ title, text, confirmButtonText = 'Continue' }) {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
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
