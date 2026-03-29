// Extends the auto-generated crazypos_devContext with RequestToken entity
// so the generated file itself does not need to be touched.
#nullable disable
using Microsoft.EntityFrameworkCore;

namespace CrazyPOS.Server.Models;

public partial class crazypos_devContext
{
    public virtual DbSet<RequestToken> RequestTokens { get; set; }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RequestToken>(entity =>
        {
            entity.ToTable("request_tokens");

            entity.HasKey(e => e.RequestTokenId).HasName("PK_request_tokens");

            entity.HasIndex(e => e.TokenHash, "IX_request_tokens_token_hash").IsUnique();
            entity.HasIndex(e => new { e.SessionId, e.ExpiresAtUtc }, "IX_request_tokens_session_expires");

            entity.Property(e => e.RequestTokenId).HasColumnName("request_token_id");
            entity.Property(e => e.SessionId).HasColumnName("session_id");
            entity.Property(e => e.TokenHash)
                .IsRequired()
                .HasMaxLength(64)
                .HasColumnName("token_hash");
            entity.Property(e => e.IssuedAtUtc)
                .HasColumnType("datetime2")
                .HasColumnName("issued_at_utc");
            entity.Property(e => e.ExpiresAtUtc)
                .HasColumnType("datetime2")
                .HasColumnName("expires_at_utc");
            entity.Property(e => e.UsedAtUtc)
                .HasColumnType("datetime2")
                .HasColumnName("used_at_utc")
                .IsConcurrencyToken();

            entity.HasOne(d => d.Session).WithMany()
                .HasForeignKey(d => d.SessionId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_request_tokens_sessions");
        });
    }
}
