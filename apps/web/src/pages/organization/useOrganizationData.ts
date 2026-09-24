import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { addFavorite, getDepartments, getEmployees, getMyFavorites, removeFavorite } from '../../lib/api';
import { Employee, FavoriteColleague, LookupItem } from '../../types';

// Shared data-fetching for every Organization sub-page (Overview, Directory,
// Department Tree, plus favorites for the directory's star toggle) — split
// out of the old single Organization.tsx component when its tabs became
// separate routed pages during the Zoho-People nav reorg, so each page
// doesn't duplicate this fetch/favorite-toggle logic.
export function useOrganizationData() {
  const { token } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteColleague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    Promise.all([getEmployees(token), getDepartments(token), getMyFavorites(token).catch(() => [])])
      .then(([e, d, f]) => {
        setEmployees(e);
        setDepartments(d);
        setFavorites(f);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function toggleFavorite(employeeId: string, isFavorite: boolean) {
    if (!token) return;
    if (isFavorite) {
      setFavorites((f) => f.filter((fav) => fav.favoriteEmployee.id !== employeeId));
      await removeFavorite(token, employeeId).catch(() => {});
    } else {
      const employee = employees.find((e) => e.id === employeeId);
      if (employee) {
        setFavorites((f) => [
          ...f,
          { id: `pending-${employeeId}`, createdAt: new Date().toISOString(), favoriteEmployee: employee },
        ]);
      }
      await addFavorite(token, employeeId).catch(() => {});
    }
  }

  return { token, employees, departments, favorites, loading, error, toggleFavorite };
}
