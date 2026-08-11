import Swal from 'sweetalert2';

export const showMessage = (title, text, icon = 'info') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonText: 'OK',
  });
};

export const showConfirm = (
  title,
  text,
  icon = 'question',
  confirmText = 'Ya',
  cancelText = 'Batal'
) => {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  }).then((result) => result.isConfirmed);
};
