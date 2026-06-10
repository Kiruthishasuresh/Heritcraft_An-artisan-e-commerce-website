package com.heritcraft.userservice.repository;

import com.heritcraft.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);
    Optional<User> findByPhone(String phone);

    @Query("SELECT COUNT(u) FROM User u WHERE u.phone = :phone")
    long countByPhone(@Param("phone") String phone);

    default boolean phoneExists(String phone) {
        return countByPhone(phone) > 0;
    }
}
